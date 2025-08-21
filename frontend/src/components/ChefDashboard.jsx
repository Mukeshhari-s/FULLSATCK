import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const ChefDashboard = ({ onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('orders', (allOrders) => {
      setOrders(allOrders);
    });
    
    return () => socketRef.current.disconnect();
  }, []);

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, { status });
      // The socket will automatically update the orders
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading Chef Dashboard...</h2>
      </div>
    );
  }

  return (
    <div>
      <header className="header-container">
        <div className="logo">
          <a href="#" onClick={() => window.scrollTo(0, 0)}>
            <img src="images/home.png" className="home-icon" alt="Home Icon" />
            Restaurant Name
          </a>
        </div>
        <div className="action-icons">
          <button type="button" onClick={onLogout}>Logout</button>
        </div>
      </header>
      <main>
        <h2>Chef Dashboard</h2>
        <p>Welcome, Chef! This is your dashboard for managing recipes and orders.</p>
        <div style={{ marginTop: '30px' }}>
          <h3>Active Orders ({orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length})</h3>
          {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length === 0 && <p>No active orders.</p>}
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(order => (
              <li key={order._id} style={{ border: '1px solid #ccc', borderRadius: '8px', margin: '10px 0', padding: '15px' }}>
                <b>Table:</b> {order.tableNumber}<br />
                <b>Status:</b> {order.status}<br />
                <b>Total Amount:</b> {order.totalAmount?.toFixed(2) || '0.00'}<br />
                <b>Date:</b> {new Date(order.createdAt).toLocaleString()}<br />
                <b>Items:</b>
                <ul>
                  {order.items.map((item, idx) => (
                    <li key={idx}>{item.title} - {item.price} {item.note ? <span style={{ color: '#888' }}>(Note: {item.note})</span> : null}</li>
                  ))}
                </ul>
                <div style={{ marginTop: '10px' }}>
                  {order.status === 'placed' && (
                    <button onClick={() => updateOrderStatus(order._id, 'accepted')} style={{ marginRight: '10px' }}>Accept Order</button>
                  )}
                  {order.status === 'accepted' && (
                    <button onClick={() => updateOrderStatus(order._id, 'preparing')} style={{ marginRight: '10px' }}>Start Preparing</button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => updateOrderStatus(order._id, 'ready')} style={{ marginRight: '10px' }}>Mark Ready</button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateOrderStatus(order._id, 'completed')} style={{ marginRight: '10px' }}>Complete Order</button>
                  )}
                  <button onClick={() => updateOrderStatus(order._id, 'cancelled')} style={{ backgroundColor: '#ff4444', color: 'white', border: 'none' }}>Cancel Order</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h3>Completed Orders ({orders.filter(o => o.status === 'completed').length})</h3>
          {orders.filter(o => o.status === 'completed').length === 0 && <p>No completed orders.</p>}
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {orders.filter(o => o.status === 'completed').map(order => (
              <li key={order._id} style={{ border: '1px solid #ccc', borderRadius: '8px', margin: '10px 0', padding: '15px', backgroundColor: '#f9f9f9' }}>
                <b>Table:</b> {order.tableNumber}<br />
                <b>Status:</b> {order.status}<br />
                <b>Total Amount:</b> {order.totalAmount?.toFixed(2) || '0.00'}<br />
                <b>Date:</b> {new Date(order.createdAt).toLocaleString()}<br />
                <b>Items:</b>
                <ul>
                  {order.items.map((item, idx) => (
                    <li key={idx}>{item.title} - {item.price} {item.note ? <span style={{ color: '#888' }}>(Note: {item.note})</span> : null}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <footer>
        <p>© 2024 Restaurant Name | All Rights Reserved</p>
      </footer>
    </div>
  );
};

export default ChefDashboard;