const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    isListed: {
        type: Boolean,
        default: true 
    }
});
 
module.exports = mongoose.model('Category', categorySchema);
