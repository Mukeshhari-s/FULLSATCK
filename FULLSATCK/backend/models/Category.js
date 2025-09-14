const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    filter: { type: String, required: true, unique: true },
    dishesPerCategory: { type: Number, default: 10 },
    description: { type: String, default: '' }
});

module.exports = mongoose.model('Category', categorySchema);