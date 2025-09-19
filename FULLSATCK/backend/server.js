const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const reservationRoutes = require('./routes/reservations');
const menuRoutes = require('./routes/menu');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/menu', menuRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

mongoose.connect('mongodb://localhost:27017/restaurant-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Load models
require('./models/Category');
require('./models/MenuItem');
const User = require('./models/User');
const Order = require('./models/Order');
const Review = require('./models/Review');
const TableReservation = require('./models/TableReservation');

// Auth endpoints are handled in routes/auth.js

// Menu endpoints
app.get('/api/menu/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort('name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/menu/items', async (req, res) => {
  try {
    const items = await MenuItem.find({ isActive: true }).populate('categoryId');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/menu/categories', async (req, res) => {
  try {
    const { name, filter, dishesPerCategory, description } = req.body;
    const category = new Category({ name, filter, dishesPerCategory, description });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/menu/categories/:id', async (req, res) => {
  try {
    const { name, filter, dishesPerCategory, description } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, filter, dishesPerCategory, description },
      { new: true }
    );
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/menu/categories/:id', async (req, res) => {
  try {
    // First delete all menu items in this category
    await MenuItem.deleteMany({ categoryId: req.params.id });
    // Then delete the category
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category and all its items deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/menu/items', async (req, res) => {
  try {
    const { categoryId, title, price, description, image } = req.body;
    const menuItem = new MenuItem({ categoryId, title, price, description, image });
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/menu/items/:id', async (req, res) => {
  try {
    const { title, price, description, image, isActive } = req.body;
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { title, price, description, image, isActive },
      { new: true }
    );
    res.json(menuItem);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/menu/items/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Item deactivated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

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

    // Enforce reservation requirement: table must have a reservation today (pending/confirmed)
    if (!tableNumber) {
      return res.status(400).json({ message: 'tableNumber is required' });
    }
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const hasReservation = await TableReservation.findOne({
      tableNumber: parseInt(tableNumber),
      reservationDate: { $gte: dayStart, $lt: dayEnd },
      status: { $in: ['pending', 'confirmed'] }
    });
    if (!hasReservation) {
      return res.status(403).json({ message: 'Please reserve a table before placing an order.' });
    }
    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
    // If status is 'pending' or missing, set to 'placed'
    let orderStatus = status;
    if (!orderStatus || orderStatus === 'pending') orderStatus = 'placed';
    const order = new Order({ tableNumber, items, totalAmount, status: orderStatus });
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
app.post('/api/interactions', async (req, res) => {
  try {
    const { userId, tableNumber, action, itemId } = req.body;
    const interaction = new UserInteraction({ userId, tableNumber, action, itemId });
    await interaction.save();
    res.status(201).json(interaction);
  } catch (err) {
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
        // Enforce reservation requirement here as well
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const hasReservation = await TableReservation.findOne({
          tableNumber: parseInt(orderData.tableNumber),
          reservationDate: { $gte: dayStart, $lt: dayEnd },
          status: { $in: ['pending', 'confirmed'] }
        });
        if (!hasReservation) {
          socket.emit('orderError', { message: 'Please reserve a table before placing an order.' });
          return;
        }

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
  socket.on('updateOrderStatus', async ({ orderId, status, chefId, message, tableNumber }) => {
    try {
      const order = await Order.findByIdAndUpdate(orderId, { status, chefId, updatedAt: Date.now() });
      const updatedOrders = await Order.find().populate('chefId', 'email').sort('-createdAt');
      
      // Emit the updated orders
      io.emit('orders', updatedOrders);
      
      // Always emit the notification with the updated status
      const tableNumber = order.tableNumber;
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
        tableNumber,
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

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));