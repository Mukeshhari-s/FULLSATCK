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
        const reservationDate = new Date(date);
        
        const existingReservation = await TableReservation.findOne({
            tableNumber,
            reservationDate: {
                $gte: new Date(reservationDate.setHours(0, 0, 0, 0)),
                $lt: new Date(reservationDate.setHours(23, 59, 59, 999))
            },
            reservationTime: time,
            status: { $in: ['pending', 'confirmed'] }
        });

        res.json({ isAvailable: !existingReservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new reservation
router.post('/', async (req, res) => {
    try {
        // Check if table is already reserved
        const existingReservation = await TableReservation.findOne({
            tableNumber: req.body.tableNumber,
            reservationDate: req.body.reservationDate,
            reservationTime: req.body.reservationTime,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingReservation) {
            return res.status(400).json({ message: 'Table is already reserved for this time' });
        }

        const reservation = new TableReservation(req.body);
        const newReservation = await reservation.save();
        
        // Emit socket event for real-time updates
        req.app.get('io').emit('newReservation', newReservation);
        
        res.status(201).json(newReservation);
    } catch (err) {
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
        req.app.get('io').emit('updateReservation', updatedReservation);
        
        res.json(updatedReservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
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
        await reservation.save();
        
        // Emit socket event for real-time updates
        req.app.get('io').emit('cancelReservation', reservation);
        
        res.json({ message: 'Reservation cancelled' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;