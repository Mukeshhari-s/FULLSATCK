const mongoose = require('mongoose');

// This is a sample schema - modify according to your needs
const SampleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Sample', SampleSchema);
