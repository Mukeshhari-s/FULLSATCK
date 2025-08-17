const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');

// Get user's cart
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            cart = new Cart({
                userId: req.user.id,
                items: [],
                total: 0
            });
            await cart.save();
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
    try {
        const { dishId, name, price, image } = req.body;
        let cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            cart = new Cart({
                userId: req.user.id,
                items: [],
                total: 0
            });
        }

        // Check if item already exists in cart
        const existingItem = cart.items.find(item => item.dishId === dishId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.items.push({ dishId, name, price, image, quantity: 1 });
        }

        // Update total
        cart.total = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove item from cart
router.delete('/remove/:dishId', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Remove item
        cart.items = cart.items.filter(item => item.dishId !== parseInt(req.params.dishId));
        
        // Update total
        cart.total = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update item quantity
router.put('/update/:dishId', auth, async (req, res) => {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.dishId === parseInt(req.params.dishId));
        if (!item) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        item.quantity = quantity;
        if (quantity <= 0) {
            cart.items = cart.items.filter(item => item.dishId !== parseInt(req.params.dishId));
        }

        // Update total
        cart.total = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
