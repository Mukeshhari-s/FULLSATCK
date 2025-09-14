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
        }).sort({ reservationDate: 1 });
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Check availability for a specific date, time, and table
router.get('/check-availability', async (req, res) => {
    try {
        const { date, time, tableNumber } = req.query;
        
        if (!date || !time || !tableNumber) {
            return res.status(400).json({ message: 'Date, time, and table number are required' });
        }

        const reservationDateTime = new Date(`${date}T${time}`);
        
        const existingReservation = await TableReservation.findOne({
            tableNumber: parseInt(tableNumber),
            reservationDate: reservationDateTime,
            status: { $in: ['pending', 'confirmed'] }
        });

        res.json({ 
            available: !existingReservation,
            message: existingReservation ? 'Table is already reserved for this time' : 'Table is available'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new reservation
router.post('/', async (req, res) => {
    try {
        const { tableNumber, reservationDate, customerName, customerPhone, customerEmail, partySize } = req.body;
        
        // Check if table is already reserved for this time
        const existingReservation = await TableReservation.findOne({
            tableNumber,
            reservationDate: new Date(reservationDate),
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingReservation) {
            return res.status(400).json({ message: 'Table is already reserved for this time' });
        }

        const reservation = new TableReservation({
            tableNumber,
            reservationDate: new Date(reservationDate),
            customerName,
            customerPhone,
            customerEmail,
            partySize,
            status: 'pending'
        });

        await reservation.save();
        res.status(201).json(reservation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update reservation status
router.patch('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const reservation = await TableReservation.findById(req.params.id);
        
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        reservation.status = status;
        await reservation.save();
        
        res.json(reservation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a reservation
router.delete('/:id', async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id);
        
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        await TableReservation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Reservation deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;