import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import MenuItem from './MenuItem';
import fetchDishImage from '../utils/unsplash';

const CustomerDashboard = ({ onLogout, tableNumber, setTableNumber }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutKey, setLogoutKey] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [itemToAdd, setItemToAdd] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [orderStatus, setOrderStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const socketRef = useRef(null);
  const [notification, setNotification] = useState('');
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define roman numerals array at the top of the component
  const romanNumerals = ['i)', 'ii)', 'iii)', 'iv)', 'v)', 'vi)', 'vii)', 'viii)', 'ix)', 'x)'];

  // Fetch menu data from API
  const fetchMenuData = async () => {
    try {
      const [categoriesResponse, itemsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/menu/categories'),
        axios.get('http://localhost:5000/api/menu/items')
      ]);
      
      setCategories(categoriesResponse.data);
      setMenuItems(itemsResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching menu data:', err);
      setLoading(false);
    }
  };

  // Group menu items by category
  const groupedItems = categories.reduce((acc, category) => {
    acc[category.filter] = menuItems.filter(item => item.categoryId._id === category._id);
    return acc;
  }, {});

  const handleFilter = (type) => {
    setFilterType(type);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const addToCart = (item) => {
    setItemToAdd(item);
    setNoteInput('');
    setShowAddNoteModal(true);
  };

  const confirmAddToCart = () => {
    setCart([...cart, { title: itemToAdd.title, price: itemToAdd.price, note: noteInput }]);
    setShowAddNoteModal(false);
    setItemToAdd(null);
    setNoteInput('');
    alert(`${itemToAdd.title} added to your cart!`);
  };

  const addToWishlist = (item) => {
    if (!wishlist.some(dish => dish.title === item.title)) {
      setWishlist([...wishlist, { title: item.title, price: item.price }]);
      alert(`${item.title} added to your wishlist!`);
    }
  };

  const removeFromWishlist = (index) => {
    setWishlist(wishlist.filter((_, i) => i !== index));
  };

  const moveToCart = (index) => {
    const item = wishlist[index];
    setWishlist(wishlist.filter((_, i) => i !== index));
    setCart([...cart, item]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const placeOrder = () => {
    const order = {
      id: `${tableNumber}-${Date.now()}`,
      tableNumber,
      items: cart,
      status: 'placed',
    };
    socketRef.current.emit('placeOrder', order);
    setOrderHistory([...orderHistory, ...cart]);
    setCart([]);
    alert('Your order has been placed!');
    setShowCartModal(false);
    setShowOrderHistoryModal(true);
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('orders', (allOrders) => {
      setOrders(allOrders);
      const myOrder = allOrders.filter(o => o.tableNumber === tableNumber).slice(-1)[0];
      if (myOrder) {
        if (orderStatus && myOrder.status !== orderStatus) {
          setNotification(`Order status updated: ${myOrder.status}`);
          setTimeout(() => setNotification(''), 3000);
        }
        setOrderStatus(myOrder.status);
      }
    });
    return () => socketRef.current.disconnect();
  }, [tableNumber, orderStatus]);

  useEffect(() => {
    // Load cart, wishlist, and order history from localStorage
    const storedCart = localStorage.getItem(`cart-${tableNumber}`);
    const storedWishlist = localStorage.getItem(`wishlist-${tableNumber}`);
    const storedOrderHistory = localStorage.getItem(`orderHistory-${tableNumber}`);
    
    if (storedCart) setCart(JSON.parse(storedCart));
    if (storedWishlist) setWishlist(JSON.parse(storedWishlist));
    if (storedOrderHistory) setOrderHistory(JSON.parse(storedOrderHistory));
  }, [tableNumber]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem(`cart-${tableNumber}`, JSON.stringify(cart));
    }
  }, [cart, tableNumber]);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem(`wishlist-${tableNumber}`, JSON.stringify(wishlist));
    }
  }, [wishlist, tableNumber]);

  // Save order history to localStorage whenever it changes
  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem(`orderHistory-${tableNumber}`, JSON.stringify(orderHistory));
    }
  }, [orderHistory, tableNumber]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Menu...</div>
      </div>
    );
  }

  if (!tableNumber) {
    return (
      <div className="table-select-container">
        <h2>Select Your Table Number</h2>
        <select onChange={e => setTableNumber(e.target.value)} defaultValue="">
          <option value="" disabled>Select table</option>
          {[...Array(20)].map((_, i) => (
            <option key={i+1} value={i+1}>Table {i+1}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <header>
        <div className="header-container" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          justifyContent: 'flex-start',
          padding: '15px 30px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          minHeight: '70px'
        }}>
          <div className="logo" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, order: 1 }}>
            <a href="#" onClick={() => window.scrollTo(0, 0)}>
              <img src="images/home.png" className="home-icon" alt="Home Icon" />
              South Indian Restaurant
            </a>
          </div>
          
          <div className="search-container" style={{ flexShrink: 0, minWidth: '250px', order: 2 }}>
            <input
              type="text"
              id="searchBar"
              placeholder="Search for dishes..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className="price-range-container" style={{ order: 3 }}>
            <label>Price Range:</label>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              min="0"
              className="price-range-input"
              onChange={e => setMinPrice(e.target.value)}
            />
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              min="0"
              className="price-range-input"
              onChange={e => setMaxPrice(e.target.value)}
            />
          </div>
          
          <div className="action-icons" style={{ marginLeft: 'auto', order: 4 }}>
            <button type="button" id="viewWishlist" onClick={() => setShowWishlistModal(true)}>
              <i className="fas fa-heart"></i> View Wishlist
            </button>
            <button type="button" id="viewCart" onClick={() => setShowCartModal(true)}>
              <i className="fas fa-shopping-cart"></i> View Cart
            </button>
            <button type="button" id="viewOrderHistory" onClick={() => setShowOrderHistoryModal(true)}>
              <i className="fas fa-history"></i> Order History
            </button>
            <button type="button" onClick={() => setShowLogoutModal(true)}>Logout</button>
          </div>
        </div>
      </header>

      {/* Show order status notification */}
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}

      {/* Show current order status */}
      {orderStatus && (
        <div className="order-status-notification">
          Current Order Status: <b>{orderStatus}</b>
        </div>
      )}

      <section className="filters">
        {categories.map((category) => (
          <button
            key={category._id}
            type="button"
            className="filter-btn"
            data-filter={category.filter}
            onClick={() => handleFilter(category.filter)}
          >
            {category.name}
          </button>
        ))}
        <button
          type="button"
          className="filter-btn"
          data-filter="all"
          onClick={() => handleFilter('all')}
        >
          All
        </button>
      </section>

      <main>
        <div id="menu">
          {categories.map((category) => (
            (filterType === 'all' || filterType === category.filter) && (
              <section key={category._id} className="menu-category" id={`category-${category._id}`}>
                <h2>{category.name}</h2>
                <div className="menu-items">
                  {groupedItems[category.filter]
                    ?.filter(item => item.title.toLowerCase().includes(searchTerm))
                    .filter(item => {
                      const min = minPrice === '' ? 0 : parseFloat(minPrice);
                      const max = maxPrice === '' ? Infinity : parseFloat(maxPrice);
                      return item.price >= min && item.price <= max;
                    })
                    .map(item => (
                      <MenuItem
                        key={item._id}
                        dish={{
                          name: item.title,
                          description: item.description,
                          price: item.price,
                          _id: item._id
                        }}
                        onAddToWishlist={() => addToWishlist(item)}
                        onAddToCart={() => addToCart(item)}
                      />
                    ))}
                </div>
              </section>
            )
          ))}
        </div>
      </main>

      <div id="wishlist-modal" className="modal" style={{ display: showWishlistModal ? 'block' : 'none' }}>
        <div className="modal-content">
          <span className="close-btn" id="closeWishlist" onClick={() => setShowWishlistModal(false)}>×</span>
          <h2>Wishlist</h2>
          <ul id="wishlist-items" style={{ listStyleType: 'none' }}>
            {wishlist.map((item, index) => (
              <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                <span>    {item.title}</span>
                <button className="edit-button" onClick={() => removeFromWishlist(index)}>Remove</button>
                <button className="move-to-cart-button" onClick={() => moveToCart(index)}>Move to Cart</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div id="cart-modal" className="modal" style={{ display: showCartModal ? 'block' : 'none' }}>
        <div className="modal-content">
          <span className="close-btn" id="closeCart" onClick={() => setShowCartModal(false)}>×</span>
          <h2>Cart</h2>
          <ul id="cart-items" style={{ listStyleType: 'none' }}>
            {cart.map((item, index) => {
              const romanNumeral = romanNumerals[index] || `${index + 1})`;
              return (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                  <span>    {romanNumeral} {item.title}{item.note ? ` (Note: ${item.note})` : ''}</span>
                  <button className="edit-cart-button" onClick={() => removeFromCart(index)}>Remove</button>
                </li>
              );
            })}
            <li id="cart-total" style={{ marginLeft: '80px', listStyleType: 'none' }}>
              Total - {cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
            </li>
            <button style={{ marginLeft: '80px', marginTop: '10px' }} onClick={placeOrder}>Place Order</button>
          </ul>
        </div>
      </div>

      <div id="order-history-modal" className="modal" style={{ display: showOrderHistoryModal ? 'block' : 'none' }}>
        <div className="modal-content">
          <span className="close-btn" id="closeOrderHistory" onClick={() => setShowOrderHistoryModal(false)}>×</span>
          <h2>Order History</h2>
          <ul id="order-history-items" style={{ listStyleType: 'none' }}>
            {orderHistory.map((item, index) => {
              const romanNumeral = romanNumerals[index] || `${index + 1})`;
              return (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                  <span>    {romanNumeral} {item.title}{item.note ? ` (Note: ${item.note})` : ''}</span>
                </li>
              );
            })}
            <li style={{ marginLeft: '40px', listStyleType: 'none' }}>
              Total Order Amount: {orderHistory.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
            </li>
          </ul>
        </div>
      </div>

      {showLogoutModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close-btn" onClick={() => setShowLogoutModal(false)}>×</span>
            <h2>Enter Key to Logout</h2>
            <input
              type="password"
              value={logoutKey}
              onChange={e => setLogoutKey(e.target.value)}
              placeholder="Enter logout key"
            />
            <button onClick={() => {
              if (logoutKey === '1234') {
                setShowLogoutModal(false);
                setLogoutKey('');
                setLogoutError('');
                setTableNumber(null);
                onLogout();
              } else {
                setLogoutError('Incorrect key.');
              }
            }}>Confirm Logout</button>
            {logoutError && <p style={{ color: 'red' }}>{logoutError}</p>}
          </div>
        </div>
      )}

      {showAddNoteModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close-btn" onClick={() => setShowAddNoteModal(false)}>×</span>
            <h2>Add Notes for {itemToAdd?.title}</h2>
            <textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Enter any notes for this item (e.g., no onions, extra spicy)"
              rows={4}
              style={{ width: '100%' }}
            />
            <button onClick={confirmAddToCart}>Add to Cart</button>
          </div>
        </div>
      )}

      <footer>
        <p>© 2024 Restaurant Name | All Rights Reserved</p>
      </footer>
    </div>
  );
};

export default CustomerDashboard;