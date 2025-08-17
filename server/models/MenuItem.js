const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner', 'snacks']
  },
  image: {
    type: String,
    required: true
  },
  isSpecialDish: {
    type: Boolean,
    default: false
  },
  availableTime: {
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    }
  },
  orderCount: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
