import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import sampleMenuItems from '../../data/sampleMenu';
import './Home.css';

const Home = () => {
  const [specialDish, setSpecialDish] = useState(null);
  const [popularDishes, setPopularDishes] = useState([]);
  const [currentMenu, setCurrentMenu] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      navigate(0); // Refresh the page to re-check auth state
    }
  }, [user, navigate]);

  useEffect(() => {
    // Using sample data for now
    const special = sampleMenuItems.find(item => item.isSpecialDish);
    const popular = sampleMenuItems.sort((a, b) => b.orderCount - a.orderCount).slice(0, 4);
    
    // Show all items for now (we'll implement time-based filtering later)
    const current = sampleMenuItems;

    setSpecialDish(special);
    setPopularDishes(popular);
    setCurrentMenu(current);
  }, []);

  const handleBuyNow = (dish) => {
    if (!user) {
      localStorage.setItem('returnPath', '/cart');
      navigate('/login', { state: { from: location } });
      return;
    }
    handleAddToCart(dish, true);
  };

  const handleAddToCart = async (dish, buyNow = false) => {
    if (!user) {
      localStorage.setItem('returnPath', buyNow ? '/cart' : location.pathname);
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      await fetch('http://localhost:5000/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          image: dish.image
        })
      });

      if (buyNow) {
        navigate('/cart');
      } else {
        alert('Added to cart successfully!');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    }
  };

  return (
    <div className="home-container">
      {/* Special Dish Section */}
      {specialDish && (
        <section className="special-dish">
          <h2>✨ Special Dish of the Day ✨</h2>
          <div className="special-dish-card">
            <div className="dish-image">
              <img src={specialDish.image} alt={specialDish.name} />
            </div>
            <div className="dish-info">
              <h3>{specialDish.name}</h3>
              <p className="description">{specialDish.description}</p>
              <p className="price">₹{specialDish.price}</p>
              <div className="button-group">
                <button className="buy-now-btn" onClick={() => handleBuyNow(specialDish)}>Buy Now</button>
                <button className="add-to-cart-btn" onClick={() => handleAddToCart(specialDish)}>Add to Cart</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular Dishes Section */}
      <section className="popular-dishes">
        <h2>👨‍🍳 Most Popular Dishes</h2>
        <div className="dishes-grid">
          {popularDishes.map(dish => (
            <div key={dish.id} className="dish-card">
              <div className="dish-image">
                <img src={dish.image} alt={dish.name} />
              </div>
              <div className="dish-content">
                <h3>{dish.name}</h3>
                <p className="description">{dish.description}</p>
                <p className="price">₹{dish.price}</p>
                <div className="button-group">
                  <button className="buy-now-btn" onClick={() => handleBuyNow(dish)}>Buy Now</button>
                  <button className="add-to-cart-btn" onClick={() => handleAddToCart(dish)}>Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Current Menu Section */}
      <section className="menu-section">
        <h2>🍽️ Our Menu</h2>
        <div className="dishes-grid">
          {currentMenu.map(dish => (
            <div key={dish.id} className="dish-card">
              <div className="dish-image">
                <img src={dish.image} alt={dish.name} />
              </div>
              <div className="dish-content">
                <h3>{dish.name}</h3>
                <p className="description">{dish.description}</p>
                <p className="price">₹{dish.price}</p>
                <div className="button-group">
                  <button className="buy-now-btn" onClick={() => handleBuyNow(dish)}>Buy Now</button>
                  <button className="add-to-cart-btn" onClick={() => handleAddToCart(dish)}>Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
