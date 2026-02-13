import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import fetchDishImage from '../utils/unsplash';
import './GuestDashboard.css';
import QRCode from 'react-qr-code';

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
    const [reservationInfo, setReservationInfo] = useState(null); // {tableNumber, reservationDate, reservationTime, numberOfGuests}
    const [placing, setPlacing] = useState(false);
    const [message, setMessage] = useState('');

    // Quick reservation flow (Guest-only)
    const [resName, setResName] = useState('');
    const [resEmail, setResEmail] = useState('');
    const [resPhone, setResPhone] = useState('');
    const [resDate, setResDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [resTime, setResTime] = useState('12:00');
    const [resGuests, setResGuests] = useState(2);
    const [tablesAvailability, setTablesAvailability] = useState([]); // [{tableNumber, isAvailable, reservationConflict, orderConflict}]
    const [checkingAvail, setCheckingAvail] = useState(false);
    const [resError, setResError] = useState('');
    const [resSuccess, setResSuccess] = useState('');
    const [selectedTable, setSelectedTable] = useState(null);
    // Reservation confirmation (now without payment)
    const [showReserveModal, setShowReserveModal] = useState(false);
    // Food payment modal (QR-based like Customer)
    const [showFoodPayModal, setShowFoodPayModal] = useState(false);
    const [foodPayProcessing, setFoodPayProcessing] = useState(false);
    const [foodTransactionCompleted, setFoodTransactionCompleted] = useState(false);
    const [foodQrData, setFoodQrData] = useState('');

    const formatINR = (value) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(Number(value) || 0);

    useEffect(() => {
        fetchMenuData();
        // Restore cart, table, and reservation from localStorage
                try {
                        const savedCart = localStorage.getItem('guestCart');
                        const savedTable = localStorage.getItem('guestTableNumber');
                        const savedRes = localStorage.getItem('guestReservation');
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
            if (savedRes) {
                try {
                    const resObj = JSON.parse(savedRes);
                    if (resObj && resObj.tableNumber) {
                        setReservationInfo(resObj);
                        setTableNumber(String(resObj.tableNumber));
                    }
                } catch {}
            } else if (savedTable) {
                // Legacy support; do not trust manual table unless we also have a reservation
                setTableNumber('');
            }
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
            // Fetch menu data (categories and items)
            const [categoriesResponse, itemsResponse] = await Promise.all([
                api.get('/menu/public/categories'),
                api.get('/menu/public/items')
            ]);
            
            // console.log('Guest - Categories Response:', categoriesResponse.data);
            // console.log('Guest - Menu Items Response:', itemsResponse.data);
            
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
        // TableNumber is derived from reservation; don't persist standalone
        if (!reservationInfo) {
            localStorage.removeItem('guestTableNumber');
        }
    }, [tableNumber]);

    // Persist reservation info
    useEffect(() => {
        if (reservationInfo) localStorage.setItem('guestReservation', JSON.stringify(reservationInfo));
        else localStorage.removeItem('guestReservation');
    }, [reservationInfo]);

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

    // Open food payment modal with total amount
    const openFoodPayment = () => {
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
        if (!reservationInfo) {
            setMessage('Please make a reservation first.');
            setShowReservation(true);
            return;
        }
        const qr = `upi://pay?pa=merchant@upi&pn=Restaurant&am=${total}&cu=INR&tn=Table${tnum}Order`;
        setFoodQrData(qr);
        setFoodTransactionCompleted(false);
        setShowFoodPayModal(true);
    };

    // After payment completes, actually place the order
    const placeOrderAfterPayment = async () => {
        try {
            setPlacing(true);
            // Expand cart lines into individual items for backend compatibility
            const items = cart.flatMap(({ title, price, note, qty }) =>
                Array.from({ length: qty || 1 }, () => ({ title, price, note }))
            );
            const tnum = parseInt(tableNumber, 10);
            await api.post('/orders', { tableNumber: tnum, items, status: 'placed' });
            clearCart();
            setMessage('Order placed successfully!');
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            console.error('Error placing order:', err);
            const msg = err.response?.data?.message || 'Failed to place order';
            setMessage(msg);
            if (err.response?.status === 403) {
                setShowReservation(true);
            }
        } finally {
            setPlacing(false);
        }
    };

    // Confirm reservation helper (no payment now)
    const confirmReservation = async (tableNum) => {
        if (!resName || !resEmail || !resPhone) {
            setResError('Please enter your name, email, and phone');
            return;
        }
        const t = tableNum || selectedTable;
        if (!t) {
            setResError('Please select a table');
            return;
        }
        try {
            const payload = {
                customerName: resName,
                customerEmail: resEmail,
                customerPhone: resPhone,
                tableNumber: t,
                reservationDate: resDate,
                reservationTime: resTime,
                numberOfGuests: resGuests,
                specialRequests: ''
            };
            const { data } = await api.post('/reservations', payload);
            setResSuccess('Reservation confirmed! You can now order dishes.');
            setTablesAvailability([]);
            setSelectedTable(null);
            setTableNumber(String(data.tableNumber || t));
            setShowReservation(false);
            setMessage(`Table ${data.tableNumber || t} reserved successfully`);
            setTimeout(() => setMessage(''), 2500);
            // Save reservation details for enforcing order requirement
            setReservationInfo({
                id: data._id,
                tableNumber: data.tableNumber || t,
                reservationDate: data.reservationDate || resDate,
                reservationTime: data.reservationTime || resTime,
                numberOfGuests: data.numberOfGuests || resGuests,
            });
        } catch (err) {
            setResError(err.response?.data?.message || 'Reservation failed');
        }
    };

    // Group items by category
    const groupedItems = menuItems.reduce((acc, item) => {
        // Group by category filter; handle populated or plain ObjectId
        // Handle both populated and non-populated categoryId
        const categoryId = item.categoryId?._id || item.categoryId;
        const category = categories.find(c => c._id === categoryId);
        
        if (category) {
            if (!acc[category.filter]) {
                acc[category.filter] = [];
            }
            acc[category.filter].push(item);
        }
        return acc;
    }, {});

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
                <div className="reservation-quick-panel">
                    <div className="reserve-only-online">Reservation is required to order. No payment is taken for reservation; online payment applies to food total only.</div>

                    {/* Contact details */}
                    <div className="reserve-controls">
                        <div className="reserve-field">
                            <label>Name</label>
                            <input type="text" value={resName} onChange={e => setResName(e.target.value)} placeholder="Your name" />
                        </div>
                        <div className="reserve-field">
                            <label>Email</label>
                            <input type="email" value={resEmail} onChange={e => setResEmail(e.target.value)} placeholder="you@example.com" />
                        </div>
                        <div className="reserve-field">
                            <label>Phone</label>
                            <input type="tel" value={resPhone} onChange={e => setResPhone(e.target.value)} placeholder="10-digit phone" />
                        </div>
                    </div>

                    {/* Date/Time/Guests */}
                    <div className="reserve-controls">
                        <div className="reserve-field">
                            <label>Date</label>
                            <input type="date" value={resDate} min={new Date().toISOString().split('T')[0]} onChange={e => setResDate(e.target.value)} />
                        </div>
                        <div className="reserve-field">
                            <label>Time</label>
                            <select value={resTime} onChange={e => setResTime(e.target.value)}>
                                {Array.from({ length: 14 }, (_, i) => 9 + i).map(h => (
                                    <option key={h} value={`${h}:00`}>
                                        {h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="reserve-field">
                            <label>Guests</label>
                            <input type="number" min="1" max="10" value={resGuests} onChange={e => setResGuests(parseInt(e.target.value || '1', 10))} />
                        </div>
                        <div className="reserve-actions">
                            <button className="reservation-button" style={{ background:'#1976d2' , color:'black'}} onClick={async () => {
                                setResError('');
                                setResSuccess('');
                                if (!resName || !resEmail || !resPhone) {
                                    setResError('Please enter your name, email, and phone');
                                    return;
                                }
                                try {
                                    setCheckingAvail(true);
                                    // Check 10 tables (1..10)
                                    const results = await Promise.all(
                                        Array.from({ length: 10 }, (_, i) => i + 1).map(async (t) => {
                                            try {
                                                const { data } = await api.get('/reservations/check-availability', { params: { date: resDate, time: resTime, tableNumber: t } });
                                                return { tableNumber: t, ...data };
                                            } catch (e) {
                                                return { tableNumber: t, isAvailable: false, reservationConflict: false, orderConflict: false };
                                            }
                                        })
                                    );
                                    setTablesAvailability(results);
                                    if (!results.some(r => r.isAvailable)) {
                                        setResError('No tables available for the selected time. Try a different time or date.');
                                    } else {
                                        setResSuccess('Select an available table to confirm reservation.');
                                    }
                                } finally {
                                    setCheckingAvail(false);
                                }
                            }} disabled={checkingAvail}>
                                {checkingAvail ? 'Checking…' : 'Check Availability'}
                            </button>
                            <button className="reservation-button" style={{ background:'#1976d2' , color:'black'}} onClick={() => {
                                setResError('');
                                if (!resName || !resEmail || !resPhone) { setResError('Please enter your name, email, and phone'); return; }
                                const firstAvail = tablesAvailability.find(r => r.isAvailable)?.tableNumber || selectedTable || 1;
                                setSelectedTable(firstAvail);
                                confirmReservation(firstAvail);
                            }}>
                                Confirm Reservation
                            </button>
                        </div>
                    </div>

                    {resError && <div className="toast" style={{ background:'#ffebee', color:'#c62828' }}>{resError}</div>}
                    {resSuccess && <div className="toast toast-success">{resSuccess}</div>}

                    <div className="tables-grid">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => {
                            const info = tablesAvailability.find(x => x.tableNumber === t);
                            const noData = tablesAvailability.length === 0; // never checked
                            const noDataAfterCheck = tablesAvailability.length > 0 && tablesAvailability.every(r => r.isAvailable === false && r.reservationConflict === false && r.orderConflict === false);
                            const treatUnknown = noData || noDataAfterCheck; // availability failed; allow proceed
                            const isAvailable = treatUnknown ? true : !!info?.isAvailable;
                            const cls = treatUnknown ? 'unknown' : (isAvailable ? 'available' : 'unavailable');
                            return (
                                <button
                                    key={t}
                                    className={`table-chip ${cls}`}
                                    style={{ color:'black'}}
                                    title={treatUnknown ? 'Availability not loaded. Click to continue.' : (isAvailable ? 'Available' : 'Unavailable')}
                                    onClick={() => {
                                        if (!resName || !resEmail || !resPhone) {
                                            setResError('Please enter your name, email, and phone first.');
                                            return;
                                        }
                                        if (!isAvailable && !treatUnknown) {
                                            setResError(`Table ${t} is unavailable for the selected time. Please choose a different time or table.`);
                                            return;
                                        }
                                        setSelectedTable(t);
                                        confirmReservation(t);
                                    }}
                                >
                                    Table {t}
                                </button>
                            );
                        })}
                    </div>
                    {/* Helper note when backend is unreachable */}
                    {tablesAvailability.length > 0 && tablesAvailability.every(r => r.isAvailable === false && r.reservationConflict === false && r.orderConflict === false) && (
                        <div className="toast" style={{ background:'#fff3cd', color:'#7a5a00' }}>
                            Live availability could not be loaded. You can still select a table to continue.
                        </div>
                    )}

                    {/* Explicit reservation confirm actions */}
                    <div style={{ marginTop: 12, display:'flex', gap:10, flexWrap:'wrap', color:'black'}}>
                        {selectedTable ? (
                            <button className="reservation-button" style={{ color:'black'}} onClick={() => confirmReservation(selectedTable)}>
                                Confirm Reservation — Table {selectedTable}
                            </button>
                        ) : (
                            (() => {
                                const firstAvail = tablesAvailability.find(r => r.isAvailable);
                                const tableNum = firstAvail?.tableNumber || 1;
                                return (
                                    <button className="reservation-button" style={{ color:'black'}} onClick={() => {
                                        if (!resName || !resEmail || !resPhone) { setResError('Please enter your name, email, and phone first.'); return; }
                                        setSelectedTable(tableNum);
                                        confirmReservation(tableNum);
                                    }}>
                                        {firstAvail ? `Use First Available — Table ${tableNum}` : 'Confirm with Table 1'}
                                    </button>
                                );
                            })()
                        )}
                    </div>
                </div>
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
                            {reservationInfo ? (
                                <div style={{ background:'#e8f5e9', color:'#2e7d32', border:'1px solid #c8e6c9', borderRadius: 20, padding: '6px 12px', fontWeight: 600 }}>
                                    Reserved: Table {reservationInfo.tableNumber}
                                </div>
                            ) : (
                                <div style={{ background:'#fff3cd', color:'#7a5a00', border:'1px solid #ffeeba', borderRadius: 20, padding: '6px 12px', fontWeight: 600 }}>
                                    No reservation — required to order
                                </div>
                            )}
                            <button
                                className="reservation-button"
                                onClick={openFoodPayment}
                                disabled={placing || cart.length === 0 || !reservationInfo}
                                title={!reservationInfo ? 'Make a reservation first' : (cart.length === 0 ? 'Add items to cart' : 'Proceed to payment')}
                            >
                                {placing ? 'Placing…' : 'Proceed to Payment'}
                            </button>
                            {!reservationInfo && (
                                <button className="secondary-btn" onClick={() => setShowReservation(true)}>Make Reservation</button>
                            )}
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
                                                        <img 
                                                            src={itemImages[item._id] || '/vite.svg'} 
                                                            alt={item.title}
                                                            className="item-image"
                                                            onError={(e) => {
                                                                e.target.src = '/vite.svg';
                                                            }}
                                                        />
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
                                onClick={openFoodPayment}
                                disabled={placing || cart.length === 0 || !tableNumber}
                                title={!tableNumber ? 'Enter table number' : (cart.length === 0 ? 'Add items to cart' : 'Proceed to payment')}
                            >
                                {placing ? 'Placing…' : 'Proceed to Payment'}
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

            {/* Food Payment Modal */}
            {showFoodPayModal && (
                <div className="modal-backdrop" onClick={() => !foodPayProcessing && setShowFoodPayModal(false)}>
                    <div className="reservation-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Order Payment</h3>
                        {!foodTransactionCompleted && !foodPayProcessing && (
                            <div>
                                <p><strong>Total Amount: ₹{total}</strong></p>
                                <p>Scan the QR code below to complete your payment:</p>
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
                                    <QRCode value={foodQrData || ''} size={200} bgColor="#ffffff" fgColor="#000000" />
                                </div>
                                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                                    After scanning the QR code and completing the payment, click the button below.
                                </p>
                                <button
                                    className="reservation-button"
                                    onClick={() => {
                                        setFoodPayProcessing(true);
                                        setTimeout(() => {
                                            setFoodPayProcessing(false);
                                            setFoodTransactionCompleted(true);
                                            setTimeout(async () => {
                                                await placeOrderAfterPayment();
                                                setShowFoodPayModal(false);
                                            }, 1200);
                                        }, 2000);
                                    }}
                                >
                                    Complete Payment
                                </button>
                                <button className="secondary-btn" disabled={foodPayProcessing} onClick={() => setShowFoodPayModal(false)} style={{ marginLeft: 8 }}>Cancel</button>
                            </div>
                        )}
                        {foodPayProcessing && (
                            <div>
                                <div style={{ margin: '30px 0', textAlign: 'center' }}>
                                    <div style={{
                                        border: '4px solid #f3f3f3',
                                        borderTop: '4px solid #3498db',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        animation: 'spin 2s linear infinite',
                                        margin: '0 auto'
                                    }} />
                                    <p style={{ marginTop: '20px', fontSize: '18px' }}>Processing Payment...</p>
                                    <p style={{ color: '#666' }}>Please wait while we verify your transaction.</p>
                                </div>
                            </div>
                        )}
                        {foodTransactionCompleted && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: '#4CAF50', fontSize: '50px', margin: '20px 0' }}>✓</div>
                                <h3 style={{ color: '#4CAF50' }}>Payment Successful!</h3>
                                <p>Placing your order…</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default GuestDashboard;