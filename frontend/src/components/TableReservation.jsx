import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { io } from 'socket.io-client';
import './TableReservation.css';

const TableReservation = () => {
    const [reservationData, setReservationData] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        tableNumber: '',
        reservationDate: '',
        reservationTime: '',
        numberOfGuests: 1,
        specialRequests: ''
    });
    const [existingReservations, setExistingReservations] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [myReservations, setMyReservations] = useState([]);
    const socket = io('http://localhost:5000');

    useEffect(() => {
        // Listen for real-time updates
        socket.on('newReservation', handleNewReservation);
        socket.on('updateReservation', handleUpdateReservation);
        socket.on('cancelReservation', handleCancelReservation);
        socket.on('confirmReservation', handleConfirmReservation);

        // Check for upcoming reservations every minute
        const interval = setInterval(checkUpcomingReservations, 60000);

        return () => {
            socket.off('newReservation');
            socket.off('updateReservation');
            socket.off('cancelReservation');
            socket.off('confirmReservation');
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        loadExistingReservations();
        loadMyReservations();
    }, [reservationData.reservationDate]);

    const loadMyReservations = () => {
        // Filter reservations for the current user based on email if entered
        if (reservationData.customerEmail) {
            const userReservations = existingReservations.filter(
                res => res.email === reservationData.customerEmail
            );
            setMyReservations(userReservations);
        } else {
            // Try to load from localStorage
            const savedReservations = localStorage.getItem('myReservations');
            if (savedReservations) {
                setMyReservations(JSON.parse(savedReservations));
            }
        }
    };

    const handleNewReservation = (reservation) => {
        setExistingReservations(prev => [...prev, reservation]);
        checkTableConflict(reservation);
    };

    const handleUpdateReservation = (updatedReservation) => {
        setExistingReservations(prev => 
            prev.map(res => res._id === updatedReservation._id ? updatedReservation : res)
        );
    };

    const handleCancelReservation = (cancelledReservation) => {
        setExistingReservations(prev => 
            prev.map(res => res._id === cancelledReservation._id ? cancelledReservation : res)
        );
        
        // Update user's reservations
        const savedReservations = JSON.parse(localStorage.getItem('myReservations') || '[]');
        const updatedMyReservations = savedReservations.map(res => 
            res._id === cancelledReservation._id ? cancelledReservation : res
        );
        localStorage.setItem('myReservations', JSON.stringify(updatedMyReservations));
        setMyReservations(updatedMyReservations);
        
        // Show notification to user if their reservation was cancelled
        if (cancelledReservation.status === 'cancelled') {
            alert(`Your reservation for Table ${cancelledReservation.tableNumber} has been cancelled by the restaurant.`);
        }
    };

    const handleConfirmReservation = (confirmedReservation) => {
        setExistingReservations(prev => 
            prev.map(res => res._id === confirmedReservation._id ? confirmedReservation : res)
        );
        
        // Update user's reservations
        const savedReservations = JSON.parse(localStorage.getItem('myReservations') || '[]');
        const updatedMyReservations = savedReservations.map(res => 
            res._id === confirmedReservation._id ? confirmedReservation : res
        );
        localStorage.setItem('myReservations', JSON.stringify(updatedMyReservations));
        setMyReservations(updatedMyReservations);
        
        // Show notification to user if their reservation was confirmed
        if (confirmedReservation.status === 'confirmed') {
            alert(`Your reservation for Table ${confirmedReservation.tableNumber} has been confirmed!`);
        }
    };

    const checkUpcomingReservations = () => {
        const now = new Date();
        existingReservations.forEach(reservation => {
            const reservationTime = new Date(reservation.reservationDate + ' ' + reservation.reservationTime);
            const timeDiff = (reservationTime - now) / (1000 * 60); // difference in minutes

            if (timeDiff <= 10 && timeDiff > 0) {
                alert(`Table ${reservation.tableNumber} will be reserved in ${Math.floor(timeDiff)} minutes!`);
            }
        });
    };

    const loadExistingReservations = async () => {
        if (!reservationData.reservationDate) return;

        try {
            const response = await api.get(`/reservations/date/${reservationData.reservationDate}`);
            setExistingReservations(response.data);
        } catch (err) {
            console.error('Error loading reservations:', err);
        }
    };

    const checkTableConflict = (newReservation) => {
        if (reservationData.tableNumber === newReservation.tableNumber &&
            reservationData.reservationDate === newReservation.reservationDate &&
            reservationData.reservationTime === newReservation.reservationTime) {
            setError('This table has just been reserved by someone else!');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            // Validate date is not in the past
            const selectedDate = new Date(reservationData.reservationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                setError('Cannot make reservations for past dates');
                return;
            }

            // Check availability
            console.log('Checking availability for:', {
                date: reservationData.reservationDate,
                time: reservationData.reservationTime,
                tableNumber: reservationData.tableNumber
            });
            
            const availabilityResponse = await api.get(`/reservations/check-availability`, {
                params: {
                    date: reservationData.reservationDate,
                    time: reservationData.reservationTime,
                    tableNumber: reservationData.tableNumber
                }
            });

            console.log('Availability response:', availabilityResponse.data);

            if (!availabilityResponse.data.isAvailable) {
                setError('This table is already reserved for the selected time');
                return;
            }

            // Create reservation
            const response = await api.post('/reservations', reservationData);
            console.log('Reservation created:', response.data);
            
            // Save to user's reservations
            const savedReservations = JSON.parse(localStorage.getItem('myReservations') || '[]');
            savedReservations.push(response.data);
            localStorage.setItem('myReservations', JSON.stringify(savedReservations));
            setMyReservations(savedReservations);
            
            setSuccess('Reservation created successfully!');
            setReservationData({
                customerName: '',
                customerEmail: '',
                customerPhone: '',
                tableNumber: '',
                reservationDate: '',
                reservationTime: '',
                numberOfGuests: 1,
                specialRequests: ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating reservation');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setReservationData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const clearAllReservations = async () => {
        if (window.confirm('Are you sure you want to clear all reservations? This action cannot be undone.')) {
            try {
                await api.delete('/reservations/clear-all');
                setSuccess('All reservations cleared successfully!');
                setExistingReservations([]);
                loadExistingReservations();
            } catch (err) {
                setError('Error clearing reservations: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    return (
        <div className="table-reservation-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Table Reservation</h2>
                <button 
                    type="button" 
                    onClick={clearAllReservations}
                    style={{
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Clear All Reservations (Test)
                </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleSubmit} className="reservation-form">
                <div className="form-group">
                    <label>Name:</label>
                    <input
                        type="text"
                        name="customerName"
                        value={reservationData.customerName}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Email:</label>
                    <input
                        type="email"
                        name="customerEmail"
                        value={reservationData.customerEmail}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Phone:</label>
                    <input
                        type="tel"
                        name="customerPhone"
                        value={reservationData.customerPhone}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Table Number:</label>
                    <select
                        name="tableNumber"
                        value={reservationData.tableNumber}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="">Select a table</option>
                        {[...Array(10)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>Table {i + 1}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Date:</label>
                    <input
                        type="date"
                        name="reservationDate"
                        value={reservationData.reservationDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Time:</label>
                    <select
                        name="reservationTime"
                        value={reservationData.reservationTime}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="">Select a time</option>
                        {[...Array(14)].map((_, i) => {
                            const hour = i + 9; // Starting from 9 AM
                            return (
                                <option key={hour} value={`${hour}:00`}>
                                    {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="form-group">
                    <label>Number of Guests:</label>
                    <input
                        type="number"
                        name="numberOfGuests"
                        value={reservationData.numberOfGuests}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Special Requests:</label>
                    <textarea
                        name="specialRequests"
                        value={reservationData.specialRequests}
                        onChange={handleInputChange}
                        rows="3"
                    />
                </div>

                <button type="submit" className="submit-button">Make Reservation</button>
            </form>

            {/* My Reservations Section */}
            {myReservations.length > 0 && (
                <div className="existing-reservations">
                    <h3>My Reservations</h3>
                    <div className="reservations-list">
                        {myReservations.map(reservation => (
                            <div key={reservation._id} className={`reservation-item ${reservation.status === 'cancelled' ? 'cancelled-reservation' : ''}`}>
                                <div>
                                    <strong>Table {reservation.tableNumber}</strong>
                                    <br />
                                    <small>{reservation.guestName || reservation.customerName || 'You'}</small>
                                </div>
                                <div>
                                    <span>{new Date(reservation.reservationDate || reservation.date).toLocaleDateString()}</span>
                                    <br />
                                    <small>{reservation.reservationTime || reservation.time}</small>
                                </div>
                                <div>
                                    <span>{reservation.numberOfGuests || reservation.partySize} guests</span>
                                    <br />
                                    <span className={`status ${reservation.status || 'pending'}`}>
                                        {(reservation.status || 'pending').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="existing-reservations">
                <h3>Today's Reservations</h3>
                <div className="reservations-list">
                    {existingReservations.length === 0 ? (
                        <p>No reservations for today.</p>
                    ) : (
                        existingReservations.map(reservation => (
                            <div key={reservation._id} className={`reservation-item ${reservation.status === 'cancelled' ? 'cancelled-reservation' : ''}`}>
                                <div>
                                    <strong>Table {reservation.tableNumber}</strong>
                                    <br />
                                    <small>{reservation.guestName || 'Guest'}</small>
                                </div>
                                <div>
                                    <span>{new Date(reservation.reservationDate || reservation.date).toLocaleDateString()}</span>
                                    <br />
                                    <small>{reservation.reservationTime || reservation.time}</small>
                                </div>
                                <div>
                                    <span>{reservation.numberOfGuests || reservation.partySize} guests</span>
                                    <br />
                                    <span className={`status ${reservation.status || 'pending'}`}>
                                        {(reservation.status || 'pending').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TableReservation;