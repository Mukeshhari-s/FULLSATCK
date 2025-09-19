import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import TableReservation from './TableReservation';
import fetchDishImage from '../utils/unsplash';
import './GuestDashboard.css';

const GuestDashboard = () => {
    const [searchParams] = useSearchParams();
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReservation, setShowReservation] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [itemImages, setItemImages] = useState({});
    const [cart, setCart] = useState([]); // [{title, price, note, qty}]
    const [tableNumber, setTableNumber] = useState('');
    const [placing, setPlacing] = useState(false);
    const [message, setMessage] = useState('');

    const formatINR = (value) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(Number(value) || 0);

    useEffect(() => {
        fetchMenuData();
        // Restore cart and table from localStorage
                try {
                        const savedCart = localStorage.getItem('guestCart');
                        const savedTable = localStorage.getItem('guestTableNumber');
                        if (savedCart) {
                                const parsed = JSON.parse(savedCart);
                                // migrate older cart format (array of items without qty) to new format with qty
                                const migrated = Array.isArray(parsed)
                                    ? parsed.reduce((acc, it) => {
                                            const key = it.title;
                                            const existing = acc.find(x => x.title === key && x.price === it.price);
                                            if (existing) existing.qty += (it.qty ? it.qty : 1);
                                            else acc.push({ title: it.title, price: it.price, note: it.note || '', qty: it.qty || 1 });
                                            return acc;
                                        }, [])
                                    : [];
                                setCart(migrated);
                        }
            if (savedTable) setTableNumber(savedTable);
        } catch {}
    }, []);

    // Auto-open reservation panel when URL has ?tab=reservation
    useEffect(() => {
        if (searchParams.get('tab') === 'reservation') {
            setShowReservation(true);
        }
    }, [searchParams]);

    const fetchMenuData = async () => {
        try {
            console.log('Attempting to fetch menu data...');
            const [categoriesResponse, itemsResponse] = await Promise.all([
                api.get('/menu/public/categories'),
                api.get('/menu/public/items')
            ]);
            
            console.log('Guest - Categories Response:', categoriesResponse.data);
            console.log('Guest - Menu Items Response:', itemsResponse.data);
            if (itemsResponse.data.length > 0) {
                console.log('Guest - Sample Menu Item:', itemsResponse.data[0]);
            }
            
            setCategories(categoriesResponse.data);
            setMenuItems(itemsResponse.data);
            
            // Load images for all menu items
            if (itemsResponse.data.length > 0) {
                const imagePromises = itemsResponse.data.map(async (item) => {
                    const imageUrl = await fetchDishImage(item.title);
                    return { id: item._id, imageUrl };
                });
                
                const images = await Promise.all(imagePromises);
                const imageMap = images.reduce((acc, { id, imageUrl }) => {
                    acc[id] = imageUrl;
                    return acc;
                }, {});
                
                setItemImages(imageMap);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching menu data:', err);
            console.error('Error details:', err.response?.data);
            setLoading(false);
        }
    };

    // Persist cart and table number
    useEffect(() => {
        localStorage.setItem('guestCart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        if (tableNumber) localStorage.setItem('guestTableNumber', tableNumber);
        else localStorage.removeItem('guestTableNumber');
    }, [tableNumber]);

    // Cart operations
    const addToCart = (item) => {
        setCart((prev) => {
            const idx = prev.findIndex(x => x.title === item.title && x.price === item.price);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], qty: (copy[idx].qty || 1) + 1 };
                return copy;
            }
            return [...prev, { title: item.title, price: item.price, note: '', qty: 1 }];
        });
        setMessage(`${item.title} added to cart`);
        setTimeout(() => setMessage(''), 1500);
    };

    const removeFromCart = (index) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const incQty = (index) => {
        setCart(prev => prev.map((it, i) => i === index ? { ...it, qty: it.qty + 1 } : it));
    };

    const decQty = (index) => {
        setCart(prev => prev.flatMap((it, i) => {
            if (i !== index) return it;
            const newQty = (it.qty || 1) - 1;
            return newQty <= 0 ? [] : { ...it, qty: newQty };
        }));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((sum, it) => sum + (Number(it.price) * (it.qty || 1) || 0), 0);

    const placeOrder = async () => {
        setMessage('');
        if (cart.length === 0) {
            setMessage('Cart is empty');
            return;
        }
        const tnum = parseInt(tableNumber, 10);
        if (!tnum || tnum <= 0) {
            setMessage('Please enter a valid table number');
            return;
        }
        try {
            setPlacing(true);
            // Expand cart lines into individual items for backend compatibility
            const items = cart.flatMap(({ title, price, note, qty }) =>
                Array.from({ length: qty || 1 }, () => ({ title, price, note }))
            );
            await api.post('/orders', { tableNumber: tnum, items, status: 'placed' });
            clearCart();
            setMessage('Order placed successfully!');
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            console.error('Error placing order:', err);
            const msg = err.response?.data?.message || 'Failed to place order';
            setMessage(msg);
            if (err.response?.status === 403) {
                // Open reservation panel to guide the user
                setShowReservation(true);
            }
        } finally {
            setPlacing(false);
        }
    };

    // Group items by category
    const groupedItems = menuItems.reduce((acc, item) => {
        console.log('Processing item:', item);
        console.log('Item categoryId:', item.categoryId);
        
        // Handle both populated and non-populated categoryId
        const categoryId = item.categoryId?._id || item.categoryId;
        const category = categories.find(c => c._id === categoryId);
        
        console.log('Found category:', category);
        
        if (category) {
            if (!acc[category.filter]) {
                acc[category.filter] = [];
            }
            acc[category.filter].push(item);
        }
        return acc;
    }, {});
    
    console.log('Grouped Items:', groupedItems);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading Menu...</div>
            </div>
        );
    }

    return (
        <div className="guest-dashboard">
            <header className="guest-header">
                <h1>Welcome to Our Restaurant</h1>
                <div className="header-actions">
                    <button 
                        className="reservation-button"
                        onClick={() => setShowReservation(!showReservation)}
                    >
                        {showReservation ? 'View Menu' : 'Make a Reservation'}
                    </button>
                </div>
            </header>

            {/* Info banner to highlight reservation updates */}
            <div style={{
                background:'#f3f6ff',
                border:'1px solid #d6e0ff',
                color:'#2643a2',
                padding:'10px 12px',
                borderRadius:8,
                margin:'8px 12px'
            }}>
                New: Reservations now enforce a 30-minute buffer and block currently occupied tables. Click "Make a Reservation" to try it, or open directly via /guest?tab=reservation.
            </div>

            {showReservation ? (
                <TableReservation />
            ) : (
                <div className="menu-section">
                    {/* Hero section */}
                    <div className="guest-hero">
                        <div className="guest-hero-content">
                            <h2>Authentic South Indian Flavors</h2>
                            <p>Freshly prepared dosas, idlis, and more—served hot and fast.</p>
                        </div>
                    </div>

                    <div className="menu-layout">
                    <div className="menu-main">
                    <div className="menu-filters">
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {/* Category pills */}
                        <div className="category-pills">
                            <button className={`pill ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
                            {categories.map(category => (
                                <button
                                  key={category._id}
                                  className={`pill ${filterType === category.filter ? 'active' : ''}`}
                                  onClick={() => setFilterType(category.filter)}
                                >
                                  {category.name}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                                type="number"
                                min="1"
                                placeholder="Table #"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                style={{ width: 100, padding: 8 }}
                            />
                            <button
                                className="reservation-button"
                                onClick={placeOrder}
                                disabled={placing || cart.length === 0}
                                title={cart.length === 0 ? 'Add items to cart' : 'Place order'}
                            >
                                {placing ? 'Placing…' : `Place Order (${formatINR(total)})`}
                            </button>
                        </div>
                    </div>

                    {message && (
                        <div className="toast toast-success">{message}</div>
                    )}

                    {/* Menu List */}

                    <div className="menu-categories">
                        {categories.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <p>No categories found. Please check if the backend server is running.</p>
                            </div>
                        )}
                        
                        {categories.map((category) => (
                            (filterType === 'all' || filterType === category.filter) && (
                                <section key={category._id} className="menu-category">
                                    <h2>{category.name}</h2>
                                    <div className="menu-items">
                                        {!groupedItems[category.filter] || groupedItems[category.filter].length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                                <p>No items found in this category.</p>
                                                <small>Category ID: {category._id}, Filter: {category.filter}</small>
                                            </div>
                                        ) : (
                                            groupedItems[category.filter]
                                                ?.filter(item => 
                                                    item.title.toLowerCase().includes(searchTerm.toLowerCase())
                                                )
                                                .map(item => (
                                                <div key={item._id} className="menu-item">
                                                    <div className="item-image-container">
                                                        {itemImages[item._id] ? (
                                                            <img 
                                                                src={itemImages[item._id]} 
                                                                alt={item.title}
                                                                className="item-image"
                                                                onError={(e) => {
                                                                    e.target.src = '/default-dish.png';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="image-loading">Loading image...</div>
                                                        )}
                                                    </div>
                                                    <div className="item-details">
                                                        <h3>{item.title}</h3>
                                                        <p>{item.description}</p>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                                            <span className="price">{formatINR(item.price)}</span>
                                                            <button onClick={() => addToCart(item)} className="reservation-button" style={{ padding: '8px 12px' }}>
                                                                Add to Cart
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>
                            )
                        ))}
                    </div>{/* end menu-categories */}

                    {/* Close menu-main column */}
                    </div>{/* end menu-main */}

                    {/* Sticky Cart Sidebar */}
                    <aside className="sticky-cart">
                        <div className="cart-panel">
                            <div className="cart-header">
                                <h3>Cart</h3>
                                <button onClick={clearCart} disabled={cart.length === 0}>Clear</button>
                            </div>
                            {cart.length === 0 ? (
                                <p className="cart-empty">Your cart is empty.</p>
                            ) : (
                                <ul className="cart-list">
                                    {cart.map((it, idx) => (
                                        <li key={idx} className="cart-row">
                                            <div className="cart-row-info">
                                                <span className="cart-title">{it.title}</span>
                                                <span className="cart-price">{formatINR(it.price)}</span>
                                            </div>
                                            <div className="cart-row-actions">
                                                <button onClick={() => decQty(idx)} className="qty-btn">−</button>
                                                <span className="qty-val">{it.qty}</span>
                                                <button onClick={() => incQty(idx)} className="qty-btn">+</button>
                                                <button onClick={() => removeFromCart(idx)} className="remove-btn">Remove</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="cart-total">
                                <span>Total</span>
                                <b>{formatINR(total)}</b>
                            </div>
                            <button
                                className="reservation-button"
                                onClick={placeOrder}
                                disabled={placing || cart.length === 0 || !tableNumber}
                                title={!tableNumber ? 'Enter table number' : (cart.length === 0 ? 'Add items to cart' : 'Place order')}
                            >
                                {placing ? 'Placing…' : 'Place Order'}
                            </button>
                            {message && message.toLowerCase().includes('reserve') && (
                                <div style={{ marginTop: 8, fontSize: 12 }}>
                                    Please make a reservation first. <button style={{ padding: 0, border: 'none', background: 'none', color: '#1976d2', cursor: 'pointer' }} onClick={() => setShowReservation(true)}>Open Reservation</button>
                                </div>
                            )}
                        </div>
                    </aside>

                    </div>{/* end menu-layout */}
                </div>
            )}
        </div>
    );
};
export default GuestDashboard;