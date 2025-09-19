import { useState, useEffect } from 'react';
import fetchDishImage from '../utils/unsplash';
import api from '../utils/api';
import './MenuItem.css';

const MenuItem = ({ dish, onAddToWishlist, onAddToCart, onReview }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      const url = await fetchDishImage(dish.name);
      setImageUrl(url);
      setIsLoading(false);
    };
    loadImage();

    // Fetch reviews for this dish
    const fetchReviews = async () => {
      try {
        const response = await api.get(`/reviews/${dish._id}`);
        setReviews(response.data);
        if (response.data.length > 0) {
          const avg = response.data.reduce((sum, r) => sum + r.rating, 0) / response.data.length;
          setAvgRating(avg);
        } else {
          setAvgRating(null);
        }
      } catch (err) {
        setReviews([]);
        setAvgRating(null);
      }
    };
    fetchReviews();
  }, [dish._id, dish.name]);

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
        {avgRating !== null && (
          <div className="dish-rating">
            <span>⭐ {avgRating.toFixed(1)} / 5</span> ({reviews.length} reviews)
          </div>
        )}
        {reviews.length > 0 && (
          <div className="dish-reviews" style={{ marginTop: '10px', fontSize: '13px' }}>
            <h4 style={{ margin: '8px 0 5px', fontSize: '14px', color: '#495057' }}>Recent Reviews:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {reviews.slice(0, 2).map((r) => (
                <li key={r._id} style={{ 
                  marginBottom: '8px', 
                  padding: '8px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  borderLeft: '3px solid #ffc107'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ color: '#495057' }}>{r.userName}</b>
                    <span style={{ color: '#ffc107', fontSize: '12px' }}>
                      {'⭐'.repeat(r.rating)} ({r.rating}/5)
                    </span>
                  </div>
                  <p style={{ margin: '5px 0 0', color: '#6c757d', fontSize: '12px' }}>
                    "{r.comment}"
                  </p>
                </li>
              ))}
            </ul>
            {reviews.length > 2 && (
              <p style={{ 
                margin: '8px 0 0', 
                fontSize: '12px', 
                color: '#007bff', 
                fontStyle: 'italic' 
              }}>
                ...and {reviews.length - 2} more review{reviews.length - 2 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
        <div className="button-container">
          {/* Row 1: Cart & Wishlist (above) */}
          <div className="icon-buttons">
            <button 
              type="button" 
              className="icon-button add-to-cart" 
              onClick={onAddToCart}
              aria-label="Add to cart"
              title="Add to cart"
            >
              <i className="fas fa-shopping-cart">🛒</i>
            </button>
            <button 
              type="button" 
              className="icon-button add-to-wishlist" 
              onClick={onAddToWishlist}
              aria-label="Add to wishlist"
              title="Add to wishlist"
            >
              <i className="fas fa-heart">❤️</i>
            </button>
          </div>

          {/* Row 2: Review (below) */}
          <div className="review-row">
            {onReview ? (
              <button 
                type="button" 
                className="review-button"
                onClick={onReview}
                aria-label="Write a review"
                title="Write a review"
              >
                <span className="review-star">★</span>
                <span>Write Review</span>
              </button>
            ) : (
              <button 
                type="button" 
                className="review-button disabled" 
                disabled
                aria-label="Order this dish first to review"
                title="Order this dish first to leave a review"
              >
                <span className="review-star">★</span>
                <span>Write Review</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItem;
