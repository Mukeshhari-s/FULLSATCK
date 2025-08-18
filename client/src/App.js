import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import './App.css';
import Home from './components/home/Home';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChatBot from './components/chatbot/ChatBot';
import Cart from './components/cart/Cart';
import Admin from './components/admin/Admin';
import ProtectedRoute from './components/common/ProtectedRoute';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">South Indian Restaurant</div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        {user ? (
          <>
            <span>Welcome, {user.name}!</span>
            <Link to="/cart">Cart</Link>
            <button onClick={handleLogout} className="auth-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/cart" 
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <div className="floating-cart-button" onClick={() => window.location.href = '/cart'}>
        <span className="cart-icon">🛒</span>
        <span>Cart</span>
      </div>
      <ChatBot />
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  );
}

export default AppWrapper;
