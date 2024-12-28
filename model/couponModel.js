
    const mongoose = require("mongoose")



    const couponSchema = new mongoose.Schema ({

        name : {
        type :   String,
        required : true,
        },
        code : {
            type : String,
            required : true,
            unique : true,
        },
        discountType: {
            type: String,
            required: true,
            enum: ['percentage', 'fixed'],
        },
        discountValue: {
            type: Number,
            required: true,
        },
        minDiscount: {
            type: Number,
            required: true,
        },
        startDate : {
        type: Date,
        required: true,
        },
        expirationDate: {
            type: Date,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        used:{
            type:Boolean,
            default:false
        }
    });


    module.exports = mongoose.model('Coupon', couponSchema);
