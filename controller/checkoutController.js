const Address = require('../model/addressModel');
const Cart = require('../model/cartModel');
const Coupon = require("../model/couponModel")


exports.renderCheckout = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.userId }).populate('products.product');
        const coupons = await Coupon.find({used : false});

        if (!cart || cart.products.length === 0) {
            return res.redirect('/');
        }
        
        const totalPrice = cart.products.reduce((total, item) => {
            return total + (item.price * item.quantity);  
        }, 0);

        const addresses = await Address.find({ userId: req.session.userId });

        res.render('user/checkout', { cart: cart.products, totalPrice, addresses, coupons });
    } catch (error) {
        console.log(error);
        res.status(500).send('Error occurred while processing checkout');
    }
};

