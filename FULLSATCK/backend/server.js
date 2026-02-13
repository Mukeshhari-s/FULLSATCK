const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// Load routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const reservationRoutes = require('./routes/reservations');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orderRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Load models
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');
const Order = require('./models/Order');
const Review = require('./models/Review');
const TableReservation = require('./models/TableReservation');

// Auth endpoints are handled in routes/auth.js

// Menu endpoints are handled by routes/menu.js

// Review endpoints

// Get average rating and top-rated dishes
app.get('/api/reviews/analytics/top-rated', async (req, res) => {
  try {
    // Average rating per dish
    const avgRatings = await Review.aggregate([
      { $group: { _id: "$dishId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      { $sort: { avgRating: -1, count: -1 } },
      { $limit: 5 }
    ]);
    // Populate dish info
    const MenuItem = require('./models/MenuItem');
    const topDishes = await Promise.all(avgRatings.map(async (r) => {
      const dish = await MenuItem.findById(r._id);
      return {
        dishId: r._id,
        title: dish?.title || 'Unknown',
        avgRating: r.avgRating,
        reviewCount: r.count
      };
    }));
    res.json(topDishes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching top-rated dishes', error: err.message });
  }
});
app.post('/api/reviews', async (req, res) => {
  try {
    console.log('Review submission request:', req.body);
    const { dishId, userId, userName, rating, comment } = req.body;
    
    // Validate required fields
    if (!dishId || !userId || !userName || !rating) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['dishId', 'userId', 'userName', 'rating'] 
      });
    }

    const review = new Review({ dishId, userId, userName, rating, comment });
    await review.save();
    console.log('Review saved successfully:', review);
    res.status(201).json(review);
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ message: 'Error submitting review', error: err.message });
  }
});

app.get('/api/reviews/:dishId', async (req, res) => {
  try {
    const reviews = await Review.find({ dishId: req.params.dishId }).sort('-createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reviews', error: err.message });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    // Total sales
    const totalSalesAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
    ]);
    const totalSales = totalSalesAgg[0]?.total || 0;
    const totalOrders = totalSalesAgg[0]?.count || 0;

    // Popular dishes
    const popularDishesAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.title", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const popularDishes = popularDishesAgg.map(d => ({ title: d._id, count: d.count }));

    // Peak hours (orders per hour)
    const peakHoursAgg = await Order.aggregate([
      { $project: { hour: { $hour: "$createdAt" } } },
      { $group: { _id: "$hour", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);
    const peakHours = peakHoursAgg.map(h => ({ hour: h._id, count: h.count }));

    // Customer stats
    const customerStatsAgg = await Order.aggregate([
      { $group: { _id: "$tableNumber", orders: { $sum: 1 }, totalSpent: { $sum: "$totalAmount" } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 }
    ]);
    const topCustomers = customerStatsAgg.map(c => ({ tableNumber: c._id, orders: c.orders, totalSpent: c.totalSpent }));

    res.json({
      totalSales,
      totalOrders,
      popularDishes,
      peakHours,
      topCustomers
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching analytics', error: err.message });
  }
});
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('chefId', 'email').sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/orders/customer/:tableNumber', async (req, res) => {
  try {
    const orders = await Order.find({ tableNumber: req.params.tableNumber }).sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { tableNumber, items, status } = req.body;
    if (!tableNumber) {
      return res.status(400).json({ message: 'tableNumber is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }
    // Normalize prices to numbers to avoid NaN
    const normalizedItems = items.map(it => ({
      title: it.title,
      price: Number(it.price) || 0,
      note: it.note || '',
      menuItemId: it.menuItemId
    }));
    const totalAmount = normalizedItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    // If status is 'pending' or missing, set to 'placed'
    let orderStatus = status;
    if (!orderStatus || orderStatus === 'pending') orderStatus = 'placed';
    const order = new Order({ tableNumber, items: normalizedItems, totalAmount, status: orderStatus });
    await order.save();
    
    // Emit real-time update to all connected clients
    const io = req.app.get('io');
    if (io) {
      const updatedOrders = await Order.find().populate('chefId', 'email').sort('-createdAt');
      io.emit('orders', updatedOrders);
    }
    
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status, chefId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, chefId, updatedAt: Date.now() },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User interaction tracking
// Interaction tracking (dev no-op to avoid undefined model crashes)
app.post('/api/interactions', async (req, res) => {
  try {
    const { userId, tableNumber, action, itemId } = req.body || {};
    console.log('Interaction:', { userId, tableNumber, action, itemId, ts: new Date().toISOString() });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error handling interaction:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Make io available to routes
app.set('io', io);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send current orders to new client
  Order.find().populate('chefId', 'email').sort('-createdAt')
    .then(orders => socket.emit('orders', orders))
    .catch(err => console.error('Error fetching orders:', err));

  // Send current reservations to new client
  const TableReservation = require('./models/TableReservation');
  TableReservation.find().sort('reservationDate reservationTime')
    .then(reservations => socket.emit('reservations', reservations))
    .catch(err => console.error('Error fetching reservations:', err));

  // Customer places an order
  socket.on('placeOrder', async (orderData) => {
      try {
        const totalAmount = orderData.items.reduce((sum, item) => sum + item.price, 0);
        // Always set status to 'placed' for new orders
        const order = new Order({ ...orderData, totalAmount, status: 'placed' });
        await order.save();
        const updatedOrders = await Order.find().populate('chefId', 'email').sort('-createdAt');
        io.emit('orders', updatedOrders);
      } catch (err) {
        console.error('Error placing order:', err);
      }
  });

  // Chef updates order status
  socket.on('updateOrderStatus', async ({ orderId, status, chefId, message }) => {
    try {
      const order = await Order.findByIdAndUpdate(orderId, { status, chefId, updatedAt: Date.now() });
      const updatedOrders = await Order.find().populate('chefId', 'email').sort('-createdAt');
      
      // Emit the updated orders
      io.emit('orders', updatedOrders);
      
      // Always emit the notification with the updated status
      const tblNumber = order?.tableNumber;
      let notificationMessage = '';
      switch(status) {
        case 'accepted':
          notificationMessage = `Your order has been accepted by the chef`;
          break;
        case 'preparing':
          notificationMessage = `Chef has started preparing your order`;
          break;
        case 'ready':
          notificationMessage = `Your order is ready to be served`;
          break;
        case 'completed':
          notificationMessage = `Your order has been completed`;
          break;
        case 'cancelled':
          notificationMessage = `Your order has been cancelled`;
          break;
        default:
          notificationMessage = `Order status updated to ${status}`;
      }

      io.emit('orderNotification', {
        tableNumber: tblNumber,
        message: notificationMessage,
        status
      });
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Development: log unhandled errors to diagnose crashes
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});