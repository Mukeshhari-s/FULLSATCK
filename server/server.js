const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const uploadRoutes = require('./routes/upload');
const menuRoutes = require('./routes/menu');

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/menu', menuRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
