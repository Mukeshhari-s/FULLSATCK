const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const menuController = require('../controllers/menuController');
const MenuItem = require('../models/MenuItem');

// Public routes for menu access
router.get('/public/categories', menuController.getCategories);
router.get('/public/items', menuController.getMenuItems);
router.get('/public/categories/:categoryId/items', menuController.getMenuItemsByCategory);

// Protected routes for authenticated users
router.get('/categories', auth, menuController.getCategories);
router.get('/items', auth, menuController.getMenuItems);
router.get('/categories/:categoryId/items', auth, menuController.getMenuItemsByCategory);

// Get menu items by category
router.get('/items/:categoryId', async (req, res) => {
    try {
        const items = await MenuItem.find({ 
            categoryId: req.params.categoryId,
            isActive: true 
        });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching menu items', error: err.message });
    }
});

module.exports = router;