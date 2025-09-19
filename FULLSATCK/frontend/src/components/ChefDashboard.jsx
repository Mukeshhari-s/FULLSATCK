import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

const ChefDashboard = ({ onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
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
    // derive socket origin from API base
    let socketOrigin = 'http://localhost:5000';
    try {
      const apiBase = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:5000/api';
      const url = new URL(apiBase);
      socketOrigin = `${url.protocol}//${url.host}`;
    } catch {}

    socketRef.current = io(socketOrigin, { transports: ['websocket', 'polling'] });
    socketRef.current.on('orders', (allOrders) => {
      setOrders(allOrders);
    });

    return () => socketRef.current && socketRef.current.disconnect();
  }, []);

  const updateOrderStatus = async (orderId, status) => {
    try {
      // Update via HTTP endpoint
      await api.put(`/orders/${orderId}/status`, { status });
      
      // Find the order to get the table number
      const order = orders.find(o => o._id === orderId);
      if (!order) return;

      // Generate notification message
      let message = '';
      switch(status) {
        case 'accepted':
          message = `Your order has been accepted by the chef`;
          break;
        case 'preparing':
          message = `Chef has started preparing your order`;
          break;
        case 'ready':
          message = `Your order is ready to be served`;
          break;
        case 'completed':
          message = `Your order has been completed`;
          break;
        case 'cancelled':
          message = `Your order has been cancelled`;
          break;
        default:
          message = `Order status updated to ${status}`;
      }

      // Emit via socket for real-time updates with the notification message
      socketRef.current && socketRef.current.emit('updateOrderStatus', {
        orderId,
        status,
        tableNumber: order.tableNumber,
        message,
        chefId: null // We're not tracking chef ID in this implementation
      });
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

        {/* Quick Reviews Overview */}
        <div style={{ marginTop: '30px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>Customer Feedback Summary</h3>
          <p style={{ color: '#6c757d', marginBottom: '15px' }}>
            See detailed reviews and ratings in the Admin Dashboard
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '15px', 
              borderRadius: '8px', 
              border: '1px solid #dee2e6',
              minWidth: '200px'
            }}>
              <h4 style={{ margin: 0, color: '#495057' }}>💡 Tip</h4>
              <p style={{ margin: '5px 0 0', fontSize: '14px' }}>
                Encourage customers to leave reviews after completing their orders!
              </p>
            </div>
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '15px', 
              borderRadius: '8px', 
              border: '1px solid #dee2e6',
              minWidth: '200px'
            }}>
              <h4 style={{ margin: 0, color: '#495057' }}>📊 Analytics</h4>
              <p style={{ margin: '5px 0 0', fontSize: '14px' }}>
                Check the Admin Dashboard for detailed review analytics and top-rated dishes.
              </p>
            </div>
          </div>
        </div>
      </main>
      <footer>
        <p>© 2024 Restaurant Name | All Rights Reserved</p>
      </footer>
    </div>
  );
};

export default ChefDashboard;