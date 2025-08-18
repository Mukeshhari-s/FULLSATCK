import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NavigationBar.css';

const NavigationBar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <Link to="/">South Indian Restaurant</Link>
      </div>
      <div className="nav-links">
        <Link to="/" className="nav-link">Menu</Link>
        {user ? (
          <>
            <Link to="/cart" className="nav-link">
              <span className="cart-icon">🛒 Cart</span>
            </Link>
            <button onClick={logout} className="nav-link logout-btn">Logout</button>
          </>
        ) : (
          <Link to="/login" className="nav-link">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default NavigationBar;
