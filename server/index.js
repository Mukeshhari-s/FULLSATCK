const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (You'll need to add your MongoDB URI in a .env file)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Could not connect to MongoDB:', err));

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
