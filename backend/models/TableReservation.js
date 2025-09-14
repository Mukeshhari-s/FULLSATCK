const mongoose = require('mongoose');

const tableReservationSchema = new mongoose.Schema({
    tableNumber: {
        type: Number,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    reservationDate: {
        type: Date,
        required: true
    },
    reservationTime: {
        type: String,
        required: true
    },
    numberOfGuests: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    specialRequests: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Validate that reservation date is not in the past
tableReservationSchema.pre('save', function(next) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const reservationDate = new Date(this.reservationDate);
    reservationDate.setHours(0, 0, 0, 0);
    
    if (reservationDate < currentDate) {
        next(new Error('Reservation date cannot be in the past'));
    }
    next();
});

module.exports = mongoose.model('TableReservation', tableReservationSchema);