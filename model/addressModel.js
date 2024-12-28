const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    name: {  
        type: String,
        required: true, 
    },
    street: {
        type: String,
        required: true, 
    },
    city: {
        type: String,
        required: true, 
    },
    state: {
        type: String,
        required: true, 
    },
    zip: {
        type: String,
        required: true, 
    },
    phone:{
        type: String,
        required:true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Address', addressSchema);
