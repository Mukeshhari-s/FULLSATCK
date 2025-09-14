const express = require('express');
const router = express.Router();
const TableReservation = require('../models/TableReservation');

// Get all reservations
router.get('/', async (req, res) => {
    try {
        const reservations = await TableReservation.find().sort({ reservationDate: 1 });
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Clear all reservations (for testing)
router.delete('/clear-all', async (req, res) => {
    try {
        await TableReservation.deleteMany({});
        res.json({ message: 'All reservations cleared successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get reservations for a specific date
router.get('/date/:date', async (req, res) => {
    try {
        const date = new Date(req.params.date);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const reservations = await TableReservation.find({
            reservationDate: {
                $gte: date,
                $lt: nextDate
            }
        });
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Check table availability
router.get('/check-availability', async (req, res) => {
    try {
        const { date, time, tableNumber } = req.query;
        console.log('Checking availability for:', { date, time, tableNumber });
        
        // Create date object properly
        const reservationDate = new Date(date);
        console.log('Parsed reservation date:', reservationDate);
        
        // Find existing reservations for the same table, date, and time
        const existingReservation = await TableReservation.findOne({
            tableNumber: parseInt(tableNumber),
            reservationDate: {
                $gte: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate()),
                $lt: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate() + 1)
            },
            reservationTime: time,
            status: { $in: ['pending', 'confirmed'] }
        });

        console.log('Existing reservation found:', existingReservation);
        
        res.json({ isAvailable: !existingReservation });
    } catch (err) {
        console.error('Error checking availability:', err);
        res.status(500).json({ message: err.message });
    }
});

// Create a new reservation
router.post('/', async (req, res) => {
    try {
        console.log('Creating reservation with data:', req.body);
        
        // Parse date properly
        const reservationDate = new Date(req.body.reservationDate);
        
        // Check if table is already reserved
        const existingReservation = await TableReservation.findOne({
            tableNumber: parseInt(req.body.tableNumber),
            reservationDate: {
                $gte: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate()),
                $lt: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate() + 1)
            },
            reservationTime: req.body.reservationTime,
            status: { $in: ['pending', 'confirmed'] }
        });

        console.log('Existing reservation check:', existingReservation);

        if (existingReservation) {
            return res.status(400).json({ message: 'Table is already reserved for this time' });
        }

        // Create reservation with proper data types
        const reservationData = {
            ...req.body,
            tableNumber: parseInt(req.body.tableNumber),
            numberOfGuests: parseInt(req.body.numberOfGuests),
            reservationDate: reservationDate,
            status: 'pending'
        };

        const reservation = new TableReservation(reservationData);
        const newReservation = await reservation.save();
        
        console.log('New reservation created:', newReservation);
        
        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').emit('newReservation', newReservation);
        }
        
        res.status(201).json(newReservation);
    } catch (err) {
        console.error('Error creating reservation:', err);
        res.status(400).json({ message: err.message });
    }
});

// Update a reservation
router.patch('/:id', async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        Object.keys(req.body).forEach(key => {
            reservation[key] = req.body[key];
        });

        const updatedReservation = await reservation.save();
        
        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').emit('updateReservation', updatedReservation);
        }
        
        res.json(updatedReservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Confirm a reservation
router.patch('/:id/confirm', async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        reservation.status = 'confirmed';
        const confirmedReservation = await reservation.save();
        
        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').emit('confirmReservation', confirmedReservation);
        }
        
        res.json({ message: 'Reservation confirmed', reservation: confirmedReservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Cancel a reservation
router.delete('/:id', async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        reservation.status = 'cancelled';
        const cancelledReservation = await reservation.save();
        
        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').emit('cancelReservation', cancelledReservation);
        }
        
        res.json({ message: 'Reservation cancelled', reservation: cancelledReservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;