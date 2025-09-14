// Clear all reservations script
// Run this with: node clear-reservations.js

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/restaurant-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const reservationSchema = new mongoose.Schema({
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  tableNumber: Number,
  reservationDate: Date,
  reservationTime: String,
  numberOfGuests: Number,
  specialRequests: String,
  status: { type: String, default: 'pending' }
});

const TableReservation = mongoose.model('TableReservation', reservationSchema);

async function clearReservations() {
  try {
    console.log('Clearing all reservations...');
    const result = await TableReservation.deleteMany({});
    console.log(`Deleted ${result.deletedCount} reservations`);
    
    // Also check if there are any remaining
    const remaining = await TableReservation.find({});
    console.log(`Remaining reservations: ${remaining.length}`);
    
    if (remaining.length > 0) {
      console.log('Remaining reservations:', remaining);
    }
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

clearReservations();