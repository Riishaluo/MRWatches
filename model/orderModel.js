const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        name: String,
        street: String,
        city: String,
        state: String,
        zip: String,
        phone: String
    },
    cartItems: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'returned'],
        default: 'pending'
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    orderId: { type: String,
        required: true
     }, 
    paymentStatus: {
        type: String,
        default: 'pending'
    },
    cancelReason: {
        type: String, 
        required: false, 
    },
    cancelReason: { 
        type: String, 
        enum: [
            'change_of_mind',
            'found_better_price',
            'delivery_issue',
            'delayed_shipment',
            'other'
        ],
        default: null,
    },
    returnRequested: { type: Boolean, default: false },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('Order', OrderSchema);
