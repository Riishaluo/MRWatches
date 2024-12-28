const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    transaction:[
        {
            amount:{type:Number,required:true},
            Date:{type:Date,default:Date.now},
            type:{type:String,required : true,enum : [ "credit","debit"]}
        }
    ]
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
    