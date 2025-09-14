import { useState, useEffect } from 'react';
import fetchDishImage from '../utils/unsplash';
import './MenuItem.css';

const MenuItem = ({ dish, onAddToWishlist, onAddToCart }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      const url = await fetchDishImage(dish.name);
      setImageUrl(url);
      setIsLoading(false);
    };

    loadImage();
  }, [dish.name]);

  return (
    <div className="menu-item" data-id={dish._id}>
      <div className="menu-item-image">
        {isLoading ? (
          <div className="image-loading">Loading...</div>
        ) : (
          <img 
            src={imageUrl || '/default-dish.png'} 
            alt={dish.name}
            onError={(e) => {
              e.target.src = '/default-dish.png';
            }}
          />
        )}
      </div>
      <div className="menu-item-details">
        <h3>{dish.name}</h3>
        <p>{dish.description}</p>
        <span className="price">₹{dish.price}</span>
        <div className="button-container">
          <button 
            type="button" 
            className="add-to-wishlist" 
            onClick={onAddToWishlist}
          >
            <i className="fas fa-heart">❤️</i>
          </button>
          <button 
            type="button" 
            className="add-to-cart" 
            onClick={onAddToCart}
          >
            <i className="fas fa-shopping-cart">🛒</i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuItem;
