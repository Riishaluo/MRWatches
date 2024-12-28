const Coupon = require("../model/couponModel")
const Cart = require("../model/cartModel")
const Order = require("../model/orderModel")

exports.applyCoupon = async (req,res)=>{
    const {couponCode , totalPrice} = req.body;
    if (!couponCode) {
        return res.status(400).json({ success: false, message: "Coupon code is required." });
    }

    try {
        const coupon = await Coupon.findOne({ code: couponCode});
        
        console.log(coupon)

        if (!coupon) {
            return res.status(400).json({ success: false, message: "Invalid coupon code." });
        }

        if (coupon.expirationDate < new Date()) {
            return res.status(400).json({ success: false, message: "Coupon has expired." });
        }

        if (coupon.used) {
            return res.status(400).json({ success: false, message: "Coupon has already been used." });
        }

        let discountAmount = 0;
        if (totalPrice >= coupon.minDiscount) { 
            if (coupon.discountType === 'percentage') {
                discountAmount = (coupon.discountValue / 100) * totalPrice;
            } else if (coupon.discountType === 'fixed') {
                discountAmount = coupon.discountValue;
            }
        } else {
            return res.status(400).json({
                success: false,
                message: `This coupon is only valid for orders above Rs.${coupon.minDiscount}.`,
            });
        }

        const newTotalPrice = Math.max(0, totalPrice - discountAmount);

        req.session.couponCode = couponCode

        res.json({
            success: true,
            message: `Coupon applied! You saved Rs.${discountAmount.toFixed(2)}.`,
            newTotalPrice
        });
    } catch (error) {
        console.error("Error applying coupon:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
}


exports.removeCoupon = async (req, res) => {
    try {
        const { originalTotalPrice } = req.body;
        
        req.session.couponCode = null;

        res.json({
            success: true,
            message: "Coupon removed successfully.",
            originalTotalPrice,
        });
    } catch (error) {
        console.error("Error removing coupon:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
};
