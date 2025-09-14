const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);