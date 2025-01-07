
const Cart = require("../model/cartModel")
const Product = require("../model/productModel")
const Offer = require("../model/offerModel")



exports.addToCart = async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const product = await Product.findById(productId).populate("category");

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (product.stock <= 0) {
            return res.status(400).json({ error: "Item out of stock" });
        }

        let discountPrice = product.price;
        let bestOffer = null;

        let productOffer = await Offer.findOne({
            productId: productId,
            isActive: true,
        });

        let categoryOffer = null;
        if (!productOffer) {
            categoryOffer = await Offer.findOne({
                categoryId: product.category,
                isActive: true,
            });
        }

        let productDiscountPrice = product.price;
        if (productOffer) {
            if (productOffer.discount.type === "fixed") {
                productDiscountPrice = product.price - productOffer.discount.value;
            } else if (productOffer.discount.type === "percentage") {
                productDiscountPrice = product.price - (product.price * productOffer.discount.value) / 100;
            }
        }

        let categoryDiscountPrice = product.price;
        if (categoryOffer) {
            if (categoryOffer.discount.type === "fixed") {
                categoryDiscountPrice = product.price - categoryOffer.discount.value;
            } else if (categoryOffer.discount.type === "percentage") {
                categoryDiscountPrice = product.price - (product.price * categoryOffer.discount.value) / 100;
            }
        }

        discountPrice = Math.min(productDiscountPrice, categoryDiscountPrice);

        bestOffer = discountPrice === productDiscountPrice ? productOffer : categoryOffer;

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                products: [],
                totalPrice: 0,
            });
        }

        const maxQuantityAllowed = Math.min(5, product.stock);

        const existingProductIndex = cart.products.findIndex(item => item.product.toString() === productId);

        if (existingProductIndex > -1) {
            const currentQuantity = cart.products[existingProductIndex].quantity;

            if (currentQuantity < maxQuantityAllowed) {
                cart.products[existingProductIndex].quantity = Math.min(currentQuantity + 1, maxQuantityAllowed);
            } else {
                return res.status(400).json({ message: `You can only add up to ${maxQuantityAllowed} units of this product.` });
            }
        } else {
            cart.products.push({
                product: productId,
                quantity: 1,
                price: discountPrice,
                offer: bestOffer,
            });
        }

        cart.totalPrice = cart.products.reduce((total, item) => total + item.price * item.quantity, 0);
        await cart.save();

        res.status(200).json({ message: 'Product added to cart successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error adding product to cart' });
    }
};



exports.renderCart = async (req, res) => {
    const userId = req.session.userId;
    
    try {
        const cart = await Cart.findOne({ user: userId }).populate('products.product');

        let total = 0;

        if (cart && cart.products.length > 0) {
            for (let item of cart.products) {
                const product = item.product;


                const itemTotal = item.price * item.quantity;
                total += itemTotal;
            }
        }

        res.render('user/cart', { cart, total });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error rendering cart page');
    }
};

exports.removeItem = async (req, res) => {
    const userId = req.session.userId;
    const productId = req.body.productId;

    try {
        const cart = await Cart.findOne({ user: userId }).populate('products.product');

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const productToRemove = cart.products.find(
            (item) => item.product._id.toString() === productId
        );

        if (!productToRemove) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        cart.products = cart.products.filter(
            (item) => item.product._id.toString() !== productId
        );

        let total = 0;

        for (let item of cart.products) {
            let discountPrice = item.product.price;
            let bestOffer = null;

            let productOffer = await Offer.findOne({
                productId: item.product._id,
                isActive: true,
            });

            let categoryOffer = null;
            if (!productOffer) {
                categoryOffer = await Offer.findOne({
                    categoryId: item.product.category,
                    isActive: true,
                });
            }

            let productDiscountPrice = item.product.price;
            if (productOffer) {
                if (productOffer.discount.type === "fixed") {
                    productDiscountPrice = item.product.price - productOffer.discount.value;
                } else if (productOffer.discount.type === "percentage") {
                    productDiscountPrice = item.product.price - (item.product.price * productOffer.discount.value) / 100;
                }
            }

            let categoryDiscountPrice = item.product.price;
            if (categoryOffer) {
                if (categoryOffer.discount.type === "fixed") {
                    categoryDiscountPrice = item.product.price - categoryOffer.discount.value;
                } else if (categoryOffer.discount.type === "percentage") {
                    categoryDiscountPrice = item.product.price - (item.product.price * categoryOffer.discount.value) / 100;
                }
            }

            discountPrice = Math.min(productDiscountPrice, categoryDiscountPrice);

            bestOffer = discountPrice === productDiscountPrice ? productOffer : categoryOffer;

            total += discountPrice * item.quantity;
        }

        await cart.save();

        return res.status(200).json({ success: true, total });
    } catch (err) {
        console.error('Error removing item from cart:', err);
        res.status(500).json({ success: false, message: 'Error removing item from cart' });
    }
};



exports.updateQuantity = async (req, res) => {
    const userId = req.session.userId;
    const { productId, quantity } = req.body;

    try {
        const cart = await Cart.findOne({ user: userId }).populate('products.product');
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const item = cart.products.find(item => item.product._id.toString() === productId);
        if (!item) return res.status(404).json({ success: false, message: 'Product not found in cart' });

        const maxQuantity = Math.min(item.product.stock, 5);

        const newQuantity = Math.min(quantity, maxQuantity);
        const hitMaxQuantity = newQuantity === maxQuantity; 

        item.quantity = newQuantity;
        const itemTotal = item.price * item.quantity;

        const totalPrice = cart.products.reduce((sum, item) => {
            if (!item.product || !item.price) return sum;
            const itemTotal = item.price * item.quantity;
            return sum + itemTotal;
        }, 0);

        cart.totalPrice = totalPrice;
        await cart.save();

        res.status(200).json({ 
            success: true, 
            total: totalPrice, 
            itemTotal, 
            hitMaxQuantity 
        });

    } catch (err) {
        console.error('Error updating quantity:', err);
        res.status(500).json({ success: false, message: 'Error updating quantity' });
    }
};




