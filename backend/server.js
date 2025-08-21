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

// Use routes
app.use('/api/auth', authRoutes);

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

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  role: { type: String, required: true, enum: ['customer', 'chef', 'admin'], default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});

// Menu Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  filter: { type: String, required: true, unique: true },
  dishesPerCategory: { type: Number, default: 10 },
  description: { type: String, default: '' }
});

// Menu Item Schema
const menuItemSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  items: [{
    title: { type: String, required: true },
    price: { type: Number, required: true },
    note: { type: String, default: '' },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }
  }],
  status: { 
    type: String, 
    enum: ['placed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'placed'
  },
  chefId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Interaction Schema (for tracking user behavior)
const userInteractionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tableNumber: { type: Number },
  action: { type: String, enum: ['view_menu', 'add_to_cart', 'add_to_wishlist', 'place_order', 'view_order_history'] },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Order = mongoose.model('Order', orderSchema);
const UserInteraction = mongoose.model('UserInteraction', userInteractionSchema);

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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send current orders to new client
  Order.find().populate('chefId', 'email').sort('-createdAt')
    .then(orders => socket.emit('orders', orders))
    .catch(err => console.error('Error fetching orders:', err));

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
  socket.on('updateOrderStatus', async ({ orderId, status, chefId }) => {
    try {
      await Order.findByIdAndUpdate(orderId, { status, chefId, updatedAt: Date.now() });
      const updatedOrders = await Order.find().populate('chefId', 'email').sort('-createdAt');
      io.emit('orders', updatedOrders);
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