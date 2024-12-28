
const Categories = require("../model/categoryModel")
const Product = require("../model/productModel")
const User = require("../model/userModel")
const Offer = require("../model/offerModel")



exports.wishlistRender = async (req, res) => {
    try {
        const userId = req.session.userId;

        const categories = await Categories.find({ isListed: true });

        const user = await User.findById(userId).populate("wishlist");

        const productsWithOffers = await Promise.all(user.wishlist.map(async (product) => {
            let discountPrice = product.price;

            let offer = await Offer.findOne({
                productId: product._id,
                isActive: true,
            });

            if (!offer) {
                offer = await Offer.findOne({
                    categoryId: product.category,
                    isActive: true,
                });
            }

            if (offer) {
                if (offer.discount.type === "fixed") {
                    discountPrice = product.price - offer.discount.value;
                } else if (offer.discount.type === "percentage") {
                    discountPrice = product.price - (product.price * offer.discount.value) / 100;
                }
            }

            return {
                ...product.toObject(),
                offer,
                discountPrice,
            };
        }));

        res.render("user/wishlist", { displayCategories: categories, products: productsWithOffers, userId });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to load wishlist" });
    }
};


exports.addToWishlist = async (req, res) => {
    try {
        console.log("Adding to wishlist...");
        const { productId } = req.body;
        const userId = req.session.userId;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const user = await User.findById(userId);

        if (user.wishlist.includes(productId)) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        user.wishlist.push(productId);
        await user.save();

        res.status(200).json({ message: "Product added successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to add the product to the wishlist" });
    }
};



exports.removeWishlist = async (req,res)=>{
    try{
        const productId = req.body.productId
        const userId = req.session.userId
    
        const user = await User.findById(userId);
    
        if(!user){
            return res.status(404).json({message : "Error removing in item"})
        }
    
        user.wishlist.pull(productId)
    
        await user.save()
    
        return res.status(200).json({ message: 'Product removed from wishlist' })
    
    }catch(error){
        console.log(error)
        res.status(500).send(error)
    }
}