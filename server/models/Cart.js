const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    dishId: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    image: {
        type: String,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    items: [cartItemSchema],
    total: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);
