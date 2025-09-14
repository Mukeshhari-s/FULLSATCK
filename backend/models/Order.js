const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    tableNumber: { 
        type: Number, 
        required: true 
    },
    items: [{
        title: { type: String, required: true },
        price: { type: Number, required: true },
        note: { type: String, default: '' },
        menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }
    }],
    status: { 
        type: String, 
        enum: ['pending', 'placed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending'
    },
    chefId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    totalAmount: { 
        type: Number, 
        required: true 
    },
    razorpayOrderId: {
        type: String,
        sparse: true
    },
    paymentId: {
        type: String,
        sparse: true
    }
}, {
    timestamps: true // This adds createdAt and updatedAt fields automatically
});

module.exports = mongoose.model('Order', orderSchema);