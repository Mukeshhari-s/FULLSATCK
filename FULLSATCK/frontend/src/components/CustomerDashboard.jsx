import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import MenuItem from './MenuItem';
import fetchDishImage from '../utils/unsplash';

const CustomerDashboard = ({ onLogout, tableNumber, setTableNumber }) => {
  // Toggle this to enable/disable payment requirement
  const paymentEnabled = false;
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
  const [notificationStatus, setNotificationStatus] = useState('');
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrackOrderModal, setShowTrackOrderModal] = useState(false);
  
  // Review-related state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    dishId: '',
    dishTitle: '',
    rating: 5,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Define roman numerals array at the top of the component
  const romanNumerals = ['i)', 'ii)', 'iii)', 'iv)', 'v)', 'vi)', 'vii)', 'viii)', 'ix)', 'x)'];

  // Fetch menu data from API
  const fetchMenuData = async () => {
    try {
      const [categoriesResponse, itemsResponse] = await Promise.all([
        api.get('/menu/public/categories'),
        api.get('/menu/public/items')
      ]);
      
      console.log('Categories Response:', categoriesResponse.data);
      console.log('Menu Items Response:', itemsResponse.data);
      console.log('Sample Menu Item Structure:', itemsResponse.data[0]);
      
      setCategories(categoriesResponse.data);
      setMenuItems(itemsResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching menu data:', err);
      setLoading(false);
    }
  };

  // Fetch orders data for the current table
    const fetchOrders = async () => {
    try {
      if (tableNumber) {
        const response = await api.get(`/orders/customer/${tableNumber}`);
        setOrders(response.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Group menu items by category
  const groupedItems = categories.reduce((acc, category) => {
    console.log('Processing category:', category);
    const categoryItems = menuItems.filter(item => {
      console.log('Checking item:', item);
      console.log('Item categoryId:', item.categoryId);
      console.log('Category _id:', category._id);
      return (
        (item.categoryId?._id === category._id) || // Populated categoryId
        (item.categoryId === category._id) || // Direct ID reference
        (item.category === category._id) // Alternative field name
      );
    });
    console.log(`Found ${categoryItems.length} items for category ${category.name}`);
    acc[category.filter] = categoryItems;
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
    if (!tableNumber) return;
    try {
      const newCart = [...(cart || []), { title: itemToAdd.title, price: itemToAdd.price, note: noteInput }];
      setCart(newCart);
      setShowAddNoteModal(false);
      setItemToAdd(null);
      setNoteInput('');
      alert(`${itemToAdd.title} added to your cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart. Please try again.');
    }
  };

  const addToWishlist = (item) => {
    if (!tableNumber) return;
    try {
      if (!wishlist.some(dish => dish.title === item.title)) {
        const newWishlist = [...(wishlist || []), { title: item.title, price: item.price }];
        setWishlist(newWishlist);
        alert(`${item.title} added to your wishlist!`);
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      alert('Failed to add item to wishlist. Please try again.');
    }
  };

  const removeFromWishlist = (index) => {
    if (!tableNumber) return;
    try {
      const newWishlist = wishlist.filter((_, i) => i !== index);
      setWishlist(newWishlist);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      alert('Failed to remove item from wishlist. Please try again.');
    }
  };

  const moveToCart = (index) => {
    if (!tableNumber) return;
    try {
      const item = wishlist[index];
      const newWishlist = wishlist.filter((_, i) => i !== index);
      const newCart = [...(cart || []), item];
      setWishlist(newWishlist);
      setCart(newCart);
    } catch (error) {
      console.error('Error moving item to cart:', error);
      alert('Failed to move item to cart. Please try again.');
    }
  };

  const removeFromCart = (index) => {
    if (!tableNumber) return;
    try {
      const newCart = cart.filter((_, i) => i !== index);
      setCart(newCart);
    } catch (error) {
      console.error('Error removing from cart:', error);
      alert('Failed to remove item from cart. Please try again.');
    }
  };

  const clearOrders = async () => {
    if (window.confirm('Are you sure you want to clear all orders? This cannot be undone.')) {
      try {
        await api.delete(`/orders/customer/${tableNumber}`);
        setOrders([]);
        setOrderHistory([]);
        localStorage.removeItem(`orderHistory-${tableNumber}`);
        alert('All orders have been cleared successfully!');
      } catch (err) {
        console.error('Error clearing orders:', err);
        alert('Failed to clear orders. Please try again.');
      }
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  const initiatePayment = async () => {
    alert('Payment is currently disabled. You can place orders without payment.');
    placeOrder();
  };

  const placeOrder = () => {
    if (!tableNumber || cart.length === 0) {
      alert('Please select a table and add items to your cart before placing an order.');
      return;
    }
    if (paymentEnabled) {
      alert('Payment is required to place an order.');
      return;
    }
    try {
      const orderData = {
        tableNumber,
        items: cart,
        totalAmount: calculateTotal(),
        status: 'placed', // Always send 'placed' for new orders
      };
      api.post('/orders', orderData)
        .then(response => {
          setOrders(prev => [...prev, response.data]);
          setOrderHistory(prev => [...prev, ...cart]);
          setCart([]);
          alert('Order placed successfully!');
          // No need to emit socket.io event - backend handles real-time updates
        })
        .catch(error => {
          console.error('Error placing order:', error);
          alert('Failed to place order. Please try again.');
        });
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  // Review functions
  const openReviewModal = (dishId, dishTitle) => {
    console.log('Opening review modal for:', { dishId, dishTitle });
    
    // Check if the dish has been ordered and completed
    if (!hasOrderedDish(dishId, dishTitle)) {
      alert(`You can only review dishes that you have ordered and completed. Please order "${dishTitle}" first to leave a review.`);
      return;
    }
    
    setReviewForm({
      dishId,
      dishTitle,
      rating: 5,
      comment: ''
    });
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!tableNumber) {
      alert('Please select a table number first.');
      return;
    }

    if (!reviewForm.comment.trim()) {
      alert('Please enter a review comment.');
      return;
    }

    setSubmittingReview(true);
    try {
      console.log('Submitting review:', {
        dishId: reviewForm.dishId,
        userId: `table-${tableNumber}`,
        userName: `Table ${tableNumber}`,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });

      const response = await api.post('/reviews', {
        dishId: reviewForm.dishId,
        userId: `table-${tableNumber}`,
        userName: `Table ${tableNumber}`,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });
      
      console.log('Review submission successful:', response.data);
      alert('Review submitted successfully! Thank you for your feedback.');
      setShowReviewModal(false);
      setReviewForm({ dishId: '', dishTitle: '', rating: 5, comment: '' });
    } catch (error) {
      console.error('Error submitting review:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to submit review. ';
      if (error.response) {
        // Server responded with error status
        errorMessage += `Server error: ${error.response.data?.message || error.response.statusText}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage += 'No response from server. Please check if the backend is running.';
      } else {
        // Something else happened
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewFormChange = (field, value) => {
    setReviewForm(prev => ({ ...prev, [field]: value }));
  };

  // Check if a dish has been ordered by this table
  const hasOrderedDish = (dishId, dishTitle) => {
    // Check in completed orders
    const orderedItems = orders
      .filter(order => order.status === 'completed') // Only completed orders
      .flatMap(order => order.items || []);
    
    // Check by dishId first, then fall back to title matching
    const hasOrdered = orderedItems.some(item => 
      item.menuItemId === dishId || 
      item._id === dishId || 
      item.title === dishTitle
    );

    return hasOrdered;
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  useEffect(() => {
    if (tableNumber) {
      const storedOrders = localStorage.getItem(`orders-${tableNumber}`);
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }

      // Initial fetch of orders
      fetchOrders();

      // Set up Socket.IO connection
      socketRef.current = io('http://localhost:5000');
      
      // Listen for order updates
      socketRef.current.on('orders', (allOrders) => {
        console.log('Received orders update:', allOrders);
        const tableOrders = allOrders.filter(o => o.tableNumber.toString() === tableNumber.toString());
        if (tableOrders.length > 0) {
          console.log('Orders for table', tableNumber, ':', tableOrders);
          setOrders(tableOrders);
          
          // Store orders in localStorage
          localStorage.setItem(`orders-${tableNumber}`, JSON.stringify(tableOrders));
          
          const latestOrder = tableOrders[tableOrders.length - 1];
          if (latestOrder) {
            setOrderStatus(latestOrder.status);
          }
        }
      });

      // Listen for notifications from chef
      socketRef.current.on('orderNotification', (data) => {
        if (data.tableNumber === tableNumber) {
          setNotification(data.message);
          setNotificationStatus(data.status);
          // Fetch updated orders when notification is received
          fetchOrders();
        }
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [tableNumber]);

  // Load saved data from localStorage
  useEffect(() => {
    if (tableNumber) {
      // Load cart from localStorage
      const storedCart = localStorage.getItem(`cart-${tableNumber}`);
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          setCart(parsedCart);
          console.log('Loaded cart:', parsedCart);
        } catch (err) {
          console.error('Error loading cart from localStorage:', err);
        }
      }

      // Load wishlist from localStorage
      const storedWishlist = localStorage.getItem(`wishlist-${tableNumber}`);
      if (storedWishlist) {
        try {
          const parsedWishlist = JSON.parse(storedWishlist);
          setWishlist(parsedWishlist);
          console.log('Loaded wishlist:', parsedWishlist);
        } catch (err) {
          console.error('Error loading wishlist from localStorage:', err);
        }
      }

      // Load order history from localStorage
      const storedOrderHistory = localStorage.getItem(`orderHistory-${tableNumber}`);
      if (storedOrderHistory) {
        try {
          const parsedOrderHistory = JSON.parse(storedOrderHistory);
          setOrderHistory(parsedOrderHistory);
          console.log('Loaded order history:', parsedOrderHistory);
        } catch (err) {
          console.error('Error loading order history from localStorage:', err);
        }
      }
    }
  }, [tableNumber]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const saveDataToLocalStorage = () => {
      if (tableNumber) {
        try {
          // Save cart
          localStorage.setItem(`cart-${tableNumber}`, JSON.stringify(cart || []));
          console.log('Saved cart:', cart);

          // Save wishlist
          localStorage.setItem(`wishlist-${tableNumber}`, JSON.stringify(wishlist || []));
          console.log('Saved wishlist:', wishlist);

          // Save order history
          localStorage.setItem(`orderHistory-${tableNumber}`, JSON.stringify(orderHistory || []));
          console.log('Saved order history:', orderHistory);
        } catch (error) {
          console.error('Error saving data to localStorage:', error);
        }
      }
    };

    saveDataToLocalStorage();
  }, [cart, wishlist, orderHistory, tableNumber]);

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
        <select 
          onChange={e => {
            const selectedTable = e.target.value;
            setTableNumber(selectedTable);
            
            // Load saved data when table is selected
            const storedCart = localStorage.getItem(`cart-${selectedTable}`);
            const storedWishlist = localStorage.getItem(`wishlist-${selectedTable}`);
            const storedOrderHistory = localStorage.getItem(`orderHistory-${selectedTable}`);
            
            if (storedCart) setCart(JSON.parse(storedCart));
            if (storedWishlist) setWishlist(JSON.parse(storedWishlist));
            if (storedOrderHistory) setOrderHistory(JSON.parse(storedOrderHistory));
          }} 
          defaultValue=""
        >
          <option value="" disabled>Select table</option>
          {[...Array(20)].map((_, i) => (
            <option key={i+1} value={i+1}>Table {i+1}</option>
          ))}
        </select>
      </div>
    );
  }

  // Get notification style based on status
  const getNotificationStyle = (status) => {
    switch(status) {
      case 'accepted':
        return { backgroundColor: '#4CAF50', color: 'white' };
      case 'preparing':
        return { backgroundColor: '#2196F3', color: 'white' };
      case 'ready':
        return { backgroundColor: '#FF9800', color: 'white' };
      case 'completed':
        return { backgroundColor: '#4CAF50', color: 'white' };
      case 'cancelled':
        return { backgroundColor: '#f44336', color: 'white' };
      default:
        return { backgroundColor: '#757575', color: 'white' };
    }
  };

  return (
    <div>
      {/* Notification Display */}
      {notification && (
        <div
          style={{
            padding: '15px',
            margin: '20px 0',
            borderRadius: '5px',
            transition: 'all 0.3s ease',
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            ...getNotificationStyle(notificationStatus)
          }}
        >
          {notification}
        </div>
      )}
      
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
            <button type="button" id="trackOrder" onClick={() => setShowTrackOrderModal(true)}>
              <i className="fas fa-truck"></i> Track Order
            </button>
            <button type="button" onClick={() => setShowLogoutModal(true)}>Logout</button>
          </div>
        </div>
      </header>
{/* Track Order Modal */}
<div id="track-order-modal" className="modal" style={{ display: showTrackOrderModal ? 'block' : 'none' }}>
  <div className="modal-content" style={{ maxWidth: '800px', margin: 'auto' }}>
    <span className="close-btn" onClick={() => setShowTrackOrderModal(false)}>×</span>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2>Track Your Orders</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={fetchOrders}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
        <div style={{ 
          backgroundColor: '#f0f0f0',
          padding: '8px 15px',
          borderRadius: '20px',
          fontWeight: 'bold'
        }}>
          Table #{tableNumber}
        </div>
      </div>
    </div>
    <div style={{ marginBottom: '20px' }}>
      <button
        onClick={clearOrders}
        style={{
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          padding: '8px 15px',
          borderRadius: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        <i className="fas fa-trash-alt"></i> Clear All Orders
      </button>
    </div>

    {loading ? (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Loading orders...</p>
      </div>
    ) : orders.length > 0 ? (
      <div className="order-tracking">
        {orders
          .filter(order => order.tableNumber.toString() === tableNumber.toString())
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(order => (
            <div 
              key={order._id} 
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                margin: '10px 0',
                padding: '15px',
                backgroundColor: 
                  order.status === 'completed' ? '#e8f5e9' :
                  order.status === 'cancelled' ? '#ffebee' :
                  order.status === 'ready' ? '#fff3e0' :
                  order.status === 'preparing' ? '#e3f2fd' :
                  order.status === 'accepted' ? '#f3e5f5' : '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Order Time:</strong> {new Date(order.createdAt).toLocaleString()}</span>
                <span><strong>Total:</strong> ${order.totalAmount?.toFixed(2)}</span>
              </div>
              <div style={{ 
                backgroundColor: '#fff',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '10px'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Items:</h4>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {order.items.map((item, idx) => (
                    <li key={idx} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '5px 0',
                      borderBottom: idx < order.items.length - 1 ? '1px solid #eee' : 'none'
                    }}>
                      <span>{item.title}</span>
                      <span>${item.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ 
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span><strong>Status:</strong></span>
                <div style={{
                  padding: '5px 10px',
                  borderRadius: '15px',
                  backgroundColor: 
                    order.status === 'completed' ? '#4caf50' :
                    order.status === 'cancelled' ? '#f44336' :
                    order.status === 'ready' ? '#ff9800' :
                    order.status === 'preparing' ? '#2196f3' :
                    order.status === 'accepted' ? '#9c27b0' : '#757575',
                  color: 'white',
                  textTransform: 'capitalize'
                }}>
                  {order.status}
                </div>
              </div>
            </div>
          ))}
      </div>
    ) : (
      <p>No orders found for your table.</p>
    )}
  </div>
</div>

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

      {/* Notification Display */}
      {notification && (
        <div
          style={{
            padding: '15px',
            margin: '20px auto',
            borderRadius: '5px',
            transition: 'all 0.3s ease',
            maxWidth: '600px',
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...getNotificationStyle(notificationStatus)
          }}
        >
          <span style={{ flex: 1, textAlign: 'center' }}>{notification}</span>
          <button
            onClick={() => setNotification('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              padding: '0 10px',
              marginLeft: '10px'
            }}
          >
            ×
          </button>
        </div>
      )}

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
                          name: item.name || item.title,
                          description: item.description,
                          price: item.price,
                          _id: item._id
                        }}
                        onAddToWishlist={() => addToWishlist(item)}
                        onAddToCart={() => addToCart(item)}
                        onReview={hasOrderedDish(item._id, item.title || item.name) ? 
                          () => openReviewModal(item._id, item.title || item.name) : 
                          null
                        }
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
            <button style={{ marginLeft: '80px', marginTop: '10px' }} onClick={placeOrder}>Proceed to Place Order</button>
          </ul>
          {/* Payment status */}
          {(() => {
            const latestOrder = orders && orders.length > 0 ? orders[0] : null;
            if (latestOrder && latestOrder.status === 'paid') {
              return <div style={{ color: 'green', textAlign: 'center', marginTop: 20, fontWeight: 'bold' }}>Payment Completed</div>;
            }
            return null;
          })()}
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

      {showReviewModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close-btn" onClick={() => setShowReviewModal(false)}>×</span>
            <h2>Review: {reviewForm.dishTitle}</h2>
            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="rating" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Rating (1-5 stars):
                </label>
                <select
                  id="rating"
                  value={reviewForm.rating}
                  onChange={e => handleReviewFormChange('rating', parseInt(e.target.value))}
                  style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                >
                  <option value={1}>⭐ (1 star - Poor)</option>
                  <option value={2}>⭐⭐ (2 stars - Fair)</option>
                  <option value={3}>⭐⭐⭐ (3 stars - Good)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 stars - Very Good)</option>
                  <option value={5}>⭐⭐⭐⭐⭐ (5 stars - Excellent)</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="comment" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Your Review:
                </label>
                <textarea
                  id="comment"
                  value={reviewForm.comment}
                  onChange={e => handleReviewFormChange('comment', e.target.value)}
                  placeholder="Tell us about your experience with this dish..."
                  rows={4}
                  style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="submit" 
                  disabled={submittingReview}
                  style={{
                    backgroundColor: submittingReview ? '#6c757d' : '#28a745',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submittingReview ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
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