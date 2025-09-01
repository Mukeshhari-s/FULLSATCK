const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Delete all orders for a specific table
router.delete('/customer/:tableNumber', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    await Order.deleteMany({ tableNumber: tableNumber });
    res.status(200).json({ message: 'Orders cleared successfully' });
  } catch (error) {
    console.error('Error clearing orders:', error);
    res.status(500).json({ message: 'Error clearing orders' });
  }
});

module.exports = router;
