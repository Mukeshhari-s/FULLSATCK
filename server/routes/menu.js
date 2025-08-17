const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

// Get menu items based on current time
router.get('/', async (req, res) => {
  try {
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    // Get menu items available at current time
    const menuItems = await MenuItem.find({
      'availableTime.start': { $lte: currentTime },
      'availableTime.end': { $gte: currentTime }
    });

    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get special dish of the day
router.get('/special', async (req, res) => {
  try {
    const specialDish = await MenuItem.findOne({ isSpecialDish: true });
    res.json(specialDish);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get most ordered dishes
router.get('/popular', async (req, res) => {
  try {
    const popularDishes = await MenuItem.find()
      .sort({ orderCount: -1 })
      .limit(5);
    res.json(popularDishes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
