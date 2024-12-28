const mongoose = require("mongoose")


const offerSchema = new mongoose.Schema({
    productId :{
        type: mongoose.Schema.Types.ObjectId,
        ref : "Product",
    },
    categoryId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
    },
    title : {
        type : String,
        required : true
    },
    description :{
        type : String,
        required : true
    },
    discount : {
        type : {
            type : String,
            enum : ["fixed" , "percentage"],
            required : true
        },
        value : {
            type: Number,
            required : true
        }
    },
    offerType :{
        type : String,
        enum : ["category" , "product"],
        required : true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
})


module.exports = mongoose.model('Offer', offerSchema);