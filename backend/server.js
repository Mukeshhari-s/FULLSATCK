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

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    res.json({ user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

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

// Order endpoints
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
    const { tableNumber, items } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
    const order = new Order({ tableNumber, items, totalAmount });
    await order.save();
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
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.price, 0);
      const order = new Order({ ...orderData, totalAmount });
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