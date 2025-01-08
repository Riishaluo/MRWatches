const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
    },
    isGoogleLogin: {
        type: Boolean,
        default: false, 
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
