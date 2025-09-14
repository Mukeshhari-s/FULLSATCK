const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// Get all categories
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching categories', error: err.message });
    }
};

// Get all menu items
const getMenuItems = async (req, res) => {
    try {
        const items = await MenuItem.find({ isActive: true }).populate('categoryId');
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching menu items', error: err.message });
    }
};

// Get menu items by category
const getMenuItemsByCategory = async (req, res) => {
    try {
        const items = await MenuItem.find({ 
            categoryId: req.params.categoryId,
            isActive: true 
        });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching menu items', error: err.message });
    }
};

module.exports = {
    getCategories,
    getMenuItems,
    getMenuItemsByCategory
};