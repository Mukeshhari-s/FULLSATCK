import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Cart.css';

const Cart = () => {
    const [cart, setCart] = useState({ items: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchCart();
    }, [user, navigate]);

    const fetchCart = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/cart', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setCart(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching cart:', error);
        }
    };

    const updateQuantity = async (dishId, quantity) => {
        try {
            await fetch(`http://localhost:5000/api/cart/update/${dishId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ quantity })
            });
            fetchCart();
        } catch (error) {
            console.error('Error updating quantity:', error);
        }
    };

    const removeItem = async (dishId) => {
        try {
            await fetch(`http://localhost:5000/api/cart/remove/${dishId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchCart();
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    const proceedToCheckout = () => {
        navigate('/checkout');
    };

    if (loading) {
        return <div className="cart-container">Loading...</div>;
    }

    return (
        <div className="cart-container">
            <h2>Your Cart</h2>
            {cart.items.length === 0 ? (
                <div className="empty-cart">
                    <p>Your cart is empty</p>
                    <button onClick={() => navigate('/')}>Continue Shopping</button>
                </div>
            ) : (
                <>
                    <div className="cart-items">
                        {cart.items.map((item) => (
                            <div key={item.dishId} className="cart-item">
                                <img src={item.image} alt={item.name} className="item-image" />
                                <div className="item-details">
                                    <h3>{item.name}</h3>
                                    <p className="price">₹{item.price}</p>
                                    <div className="quantity-controls">
                                        <button 
                                            onClick={() => updateQuantity(item.dishId, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            -
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button 
                                            onClick={() => updateQuantity(item.dishId, item.quantity + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    className="remove-button"
                                    onClick={() => removeItem(item.dishId)}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="cart-summary">
                        <div className="total">
                            <span>Total:</span>
                            <span>₹{cart.total}</span>
                        </div>
                        <button 
                            className="checkout-button"
                            onClick={proceedToCheckout}
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Cart;
