const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET'
});

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, tableNumber, items } = req.body;
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paisa
      currency: 'INR',
      receipt: `table_${tableNumber}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    
    // Create a pending order in our database
    const newOrder = new Order({
      tableNumber,
      items,
      totalAmount: amount,
      status: 'pending',
      razorpayOrderId: order.id
    });
    await newOrder.save();

    res.json({
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      key: razorpay.key_id
    });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ message: 'Error creating payment' });
  }
});

// Verify Razorpay payment
router.post('/verify', async (req, res) => {
  try {
    const {
      orderCreationId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      tableNumber
    } = req.body;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET');
    shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpaySignature) {
      return res.status(400).json({ message: 'Transaction not legit!' });
    }

    // Update order status
    const order = await Order.findOne({ 
      razorpayOrderId: razorpayOrderId,
      tableNumber 
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = 'placed';
    order.paymentId = razorpayPaymentId;
    await order.save();

    res.json({
      message: 'Payment verified successfully',
      order
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ message: 'Error verifying payment' });
  }
});

module.exports = router;
