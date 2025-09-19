const express = require('express');
const router = express.Router();
const TableReservation = require('../models/TableReservation');
const Order = require('../models/Order');

// Helper: parse "HH:mm" into a Date combined with a base date
function combineDateAndTime(dateInput, timeStr) {
    const date = new Date(dateInput);
    const [hStr, mStr] = (timeStr || '00:00').split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
    return combined;
}

// Helper: minutes diff (a - b) in minutes
function diffInMinutes(a, b) {
    return (a.getTime() - b.getTime()) / (1000 * 60);
}

// Helper: determine if requestedDateTime conflicts with existing reservation within buffer
function hasReservationConflict(existingReservations, requestedDateTime, bufferMinutes = 30) {
    return existingReservations.some(r => {
        const rDate = combineDateAndTime(r.reservationDate, r.reservationTime);
        const minutes = Math.abs(diffInMinutes(rDate, requestedDateTime));
        return minutes < bufferMinutes; // conflict if within +/- buffer
    });
}

// Helper: determine if requested time overlaps with active seating (orders)
// Assumptions:
// - A table is occupied from order.createdAt until +90 minutes if not completed/cancelled
// - We also block new reservations within 30 minutes before seating starts
function hasActiveOrderConflict(activeOrders, requestedDateTime, preBufferMinutes = 30, seatingDurationMinutes = 90) {
    return activeOrders.some(o => {
        const start = new Date(o.createdAt);
        const preBlockStart = new Date(start.getTime() - preBufferMinutes * 60 * 1000);
        const end = new Date(start.getTime() + seatingDurationMinutes * 60 * 1000);
        return requestedDateTime >= preBlockStart && requestedDateTime <= end;
    });
}

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

        const reservationDate = new Date(date);
        const requestedDateTime = combineDateAndTime(reservationDate, time);

        // Get same-day reservations for the table (pending/confirmed)
        const dayStart = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
        const dayEnd = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate() + 1);
        const sameDayReservations = await TableReservation.find({
            tableNumber: parseInt(tableNumber),
            reservationDate: { $gte: dayStart, $lt: dayEnd },
            status: { $in: ['pending', 'confirmed'] }
        });
        // Double-booking prevention: if any reservation exists for the day, block
        const reservationConflict = sameDayReservations.length > 0;

        // Get active orders for the table (not completed/cancelled)
        const activeOrders = await Order.find({
            tableNumber: parseInt(tableNumber),
            status: { $nin: ['completed', 'cancelled'] }
        }).select('createdAt status tableNumber');

        const orderConflict = hasActiveOrderConflict(activeOrders, requestedDateTime, 30, 90);
        const isAvailable = !(reservationConflict || orderConflict);
        res.json({ isAvailable, reservationConflict, orderConflict });
    } catch (err) {
        console.error('Error checking availability:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get slot-by-slot availability for a date and table
// Query: date=YYYY-MM-DD, tableNumber=number
router.get('/slots', async (req, res) => {
    try {
        const { date, tableNumber } = req.query;
        if (!date || !tableNumber) {
            return res.status(400).json({ message: 'date and tableNumber are required' });
        }

        const reservationDate = new Date(date);
        const dayStart = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
        const dayEnd = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate() + 1);

        // Preload data for efficiency
        const sameDayReservations = await TableReservation.find({
            tableNumber: parseInt(tableNumber),
            reservationDate: { $gte: dayStart, $lt: dayEnd },
            status: { $in: ['pending', 'confirmed'] }
        });
        const activeOrders = await Order.find({
            tableNumber: parseInt(tableNumber),
            status: { $nin: ['completed', 'cancelled'] }
        }).select('createdAt status tableNumber');

        // If already reserved for the day, block all slots
        let slots;
        if (sameDayReservations.length > 0) {
            slots = Array.from({ length: 14 }, (_, i) => 9 + i).map(hour => ({
                time: `${hour}:00`,
                isAvailable: false,
                reservationConflict: true,
                orderConflict: false
            }));
        } else {
            // Otherwise allow slots unless blocked by active order occupancy
            slots = Array.from({ length: 14 }, (_, i) => 9 + i).map(hour => {
                const timeStr = `${hour}:00`;
                const requestedDateTime = combineDateAndTime(reservationDate, timeStr);
                const orderConflict = hasActiveOrderConflict(activeOrders, requestedDateTime, 30, 90);
                return {
                    time: timeStr,
                    isAvailable: !orderConflict,
                    reservationConflict: false,
                    orderConflict
                };
            });
        }

        res.json({ date, tableNumber: parseInt(tableNumber), slots });
    } catch (err) {
        console.error('Error fetching slots:', err);
        res.status(500).json({ message: err.message });
    }
});

// Create a new reservation
router.post('/', async (req, res) => {
    try {
        console.log('Creating reservation with data:', req.body);
        
        // Parse date properly
        const reservationDate = new Date(req.body.reservationDate);
        const requestedDateTime = combineDateAndTime(reservationDate, req.body.reservationTime);

        // Check same-day reservation conflicts with 30-min buffer
        const dayStart = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
        const dayEnd = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate() + 1);
        const sameDayReservations = await TableReservation.find({
            tableNumber: parseInt(req.body.tableNumber),
            reservationDate: { $gte: dayStart, $lt: dayEnd },
            status: { $in: ['pending', 'confirmed'] }
        });
        // Block if any reservation exists for the same table on the selected date
        const reservationConflict = sameDayReservations.length > 0;

        // Check active order conflicts
        const activeOrders = await Order.find({
            tableNumber: parseInt(req.body.tableNumber),
            status: { $nin: ['completed', 'cancelled'] }
        }).select('createdAt status tableNumber');
        const orderConflict = hasActiveOrderConflict(activeOrders, requestedDateTime, 30, 90);

        if (reservationConflict || orderConflict) {
            const reason = reservationConflict && orderConflict
                ? 'Table already reserved for today and currently occupied'
                : reservationConflict
                    ? 'This table is already reserved for the selected date'
                    : 'Table currently occupied (active order)';
            return res.status(400).json({ message: reason, reservationConflict, orderConflict });
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