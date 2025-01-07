const Product = require('../model/productModel');
const Category = require('../model/categoryModel');
const Offer = require("../model/offerModel")
const Cart = require("../model/cartModel")


exports.renderAllWatches = async (req, res) => {
    const isLoggedIn = req.session.userId ? true : false;
    const userId = req.session.userId;

    try {
        const products = await Product.find({ isListed: true });
        const displayCategories = await Category.find({ isListed: true });

        const productWithOffers = await Promise.all(
            products.map(async (product) => {
                let discountPrice = product.price;
                let offer = null;

                let productOffer = await Offer.findOne({
                    productId: product._id,
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

                offer = discountPrice === productDiscountPrice ? productOffer : categoryOffer;

                return {
                    ...product.toObject(),
                    offer,
                    discountPrice,
                };
            })
        );

        res.render('user/userProduct', {
            products: productWithOffers,
            displayCategories,
            isLoggedIn,
            userId,
            message: null 
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal server error');
    }
};



exports.renderProductDetails = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.params.id;
        const product = await Product.findById(productId).populate("category");
        const displayCategories = await Category.find({ isListed: true });

        if (!product) {
            return res.status(404).render('404', { message: 'Product not found' });
        }

        const cart = await Cart.findOne({ userId });
        const isInCart = cart
            ? cart.products.some(item => item.product.toString() === productId)
            : false;

        let offer = await Offer.findOne({
            productId: product._id,
            isActive: true,
        });

        let categoryOffer = null;
        if (!offer) {
            categoryOffer = await Offer.findOne({
                categoryId: product.category,
                isActive: true,
            });
        }

        let discountPrice = product.price;
        if (offer) {
            if (offer.discount.type === "fixed") {
                discountPrice = product.price - offer.discount.value;
            } else if (offer.discount.type === "percentage") {
                discountPrice = product.price - (product.price * offer.discount.value) / 100;
            }
        }

        if (categoryOffer) {
            let categoryDiscountPrice = product.price;
            if (categoryOffer.discount.type === "fixed") {
                categoryDiscountPrice = product.price - categoryOffer.discount.value;
            } else if (categoryOffer.discount.type === "percentage") {
                categoryDiscountPrice = product.price - (product.price * categoryOffer.discount.value) / 100;
            }


            discountPrice = Math.min(discountPrice, categoryDiscountPrice);


            offer = discountPrice === categoryDiscountPrice ? categoryOffer : offer;
        }

        const relatedProducts = await Product.find({
            _id: { $ne: productId },
            category: product.category
        }).limit(4);

        const relatedProductsWithOffers = await Promise.all(
            relatedProducts.map(async (relatedProduct) => {
                let relatedOffer = await Offer.findOne({
                    productId: relatedProduct._id,
                    isActive: true,
                });

                let relatedCategoryOffer = null;
                if (!relatedOffer) {
                    relatedCategoryOffer = await Offer.findOne({
                        categoryId: relatedProduct.category,
                        isActive: true,
                    });
                }

                let relatedDiscountPrice = relatedProduct.price;
                if (relatedOffer) {
                    if (relatedOffer.discount.type === "fixed") {
                        relatedDiscountPrice = relatedProduct.price - relatedOffer.discount.value;
                    } else if (relatedOffer.discount.type === "percentage") {
                        relatedDiscountPrice = relatedProduct.price - (relatedProduct.price * relatedOffer.discount.value) / 100;
                    }
                }


                if (relatedCategoryOffer) {
                    let relatedCategoryDiscountPrice = relatedProduct.price;
                    if (relatedCategoryOffer.discount.type === "fixed") {
                        relatedCategoryDiscountPrice = relatedProduct.price - relatedCategoryOffer.discount.value;
                    } else if (relatedCategoryOffer.discount.type === "percentage") {
                        relatedCategoryDiscountPrice = relatedProduct.price - (relatedProduct.price * relatedCategoryOffer.discount.value) / 100;
                    }

                    relatedDiscountPrice = Math.min(relatedDiscountPrice, relatedCategoryDiscountPrice);

                    relatedOffer = relatedDiscountPrice === relatedCategoryDiscountPrice ? relatedCategoryOffer : relatedOffer;
                }

                return {
                    ...relatedProduct.toObject(),
                    offer: relatedOffer,
                    discountPrice: relatedDiscountPrice,
                };
            })
        );

        let stockStatus;
        if (product.stock > 5) {
            stockStatus = 'In Stock';
        } else if (product.stock > 0 && product.stock <= 5) {
            stockStatus = 'Low Stock';
        } else if (product.stock === 0) {
            stockStatus = 'Sold Out';
        } else {
            stockStatus = 'Unavailable';
        }

        res.render('user/product_details', {
            product: { ...product.toObject(), offer, discountPrice },
            displayCategories,
            stockStatus,
            relatedProducts: relatedProductsWithOffers,
            userId,
            isInCart
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Internal server error');
    }
};


exports.renderCategoryPage = async (req, res) => {
    try {
        const categoryName = req.params.categoryName.toLowerCase();
        const userId = req.session.userId

        const category = await Category.findOne({ name: categoryName });

        if (!category) {
            return res.render('user/filterCategory', {
                userId,
                message: 'Category not found',
                products: [],
                displayCategories: await Category.find(),
            });
        }

        const products = await Product.find({ category: category._id, isListed: true });
        
        res.render('user/filterCategory', {
            category, 
            products,
            message: products.length === 0 ? 'No products in this category' : '',
            displayCategories: await Category.find(),
            userId
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

