import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import CustomerDashboard from './components/CustomerDashboard.jsx';
import ChefDashboard from './components/ChefDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import './app.css'; // Changed from './App.css'
import VoiceButton from './components/VoiceButton.jsx';

const App = () => {
  const [user, setUser] = useState(null);
  const [tableNumber, setTableNumber] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedTableNumber = localStorage.getItem('tableNumber');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedTableNumber) {
      setTableNumber(storedTableNumber);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setTableNumber(null);
    localStorage.removeItem('user');
    localStorage.removeItem('tableNumber');
  };

  const handleTableSelect = (tableNum) => {
    setTableNumber(tableNum);
    localStorage.setItem('tableNumber', tableNum);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/customer"
          element={
            user && user.role === 'customer' ? (
              <CustomerDashboard
                onLogout={handleLogout}
                tableNumber={tableNumber}
                setTableNumber={handleTableSelect}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/chef"
          element={user && user.role === 'chef' ? <ChefDashboard onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={user && user.role === 'admin' ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={
          user ? 
            (user.role === 'customer' ? <Navigate to="/customer" /> :
             user.role === 'chef' ? <Navigate to="/chef" /> :
             user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/login" />)
          : <Navigate to="/login" />
        } />
      </Routes>
      <VoiceButton onClick={() => alert('Voice search coming soon!')} />
    </>
  );
};

export default App;