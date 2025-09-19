import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { io } from 'socket.io-client';
import AnalyticsCharts from './AnalyticsCharts';

// Use environment variable for Unsplash API key
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

// Fetch multiple Unsplash images for a query
const fetchUnsplashImages = async (query, count = 5) => {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=${count}`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results.map(img => img.urls.small);
    }
  } catch (err) {
    console.error('Error fetching Unsplash images:', err);
  }
  return [];
};

// Fetch single dish image
const fetchDishImage = async (dishName) => {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(dishName + ' food')}&per_page=1`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    const data = await response.json();
    return data.results[0]?.urls?.small || null;
  } catch (error) {
    console.error('Error fetching dish image:', error);
    return null;
  }
};

const AdminDashboard = ({ onLogout }) => {
  // INR currency formatter for consistent display in Admin
  const formatINR = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const [adminData, setAdminData] = useState({});
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [editDish, setEditDish] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', photo: '', description: '' });
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', filter: '', dishesPerCategory: '', description: '' });
  const [newDishForm, setNewDishForm] = useState({ categoryId: '', title: '', price: '', description: '', image: '' });
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', filter: '', dishesPerCategory: '', description: '' });
  const [showNewDishForm, setShowNewDishForm] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dishSearch, setDishSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [openCategoryIds, setOpenCategoryIds] = useState([]); // For collapsible categories
  const [dishPage, setDishPage] = useState(1); // For dish pagination
  const dishesPerPage = 10;
  const [customerOrderPage, setCustomerOrderPage] = useState(1);
  const [chefOrderPage, setChefOrderPage] = useState(1);
  const ordersPerPage = 5;
  const [unsplashImages, setUnsplashImages] = useState([]);
  const [dishImages, setDishImages] = useState({});
  
  // Reviews state
  const [allReviews, setAllReviews] = useState([]);
  const [topRatedDishes, setTopRatedDishes] = useState([]);

  // Socket.IO connection
  const socket = io('http://localhost:5000');

  // Fetch data from API
  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const fetchMenu = async () => {
    try {
      console.log('Fetching menu items...');
      const response = await api.get('/menu/items');
      console.log('Menu items response:', response.data);
      setMenu(response.data);
      
      // Load images for all menu items
      const imagePromises = response.data.map(async (item) => {
        const imageUrl = await fetchDishImage(item.title);
        return { id: item._id, imageUrl };
      });
      
      const images = await Promise.all(imagePromises);
      const imageMap = images.reduce((acc, { id, imageUrl }) => {
        acc[id] = imageUrl;
        return acc;
      }, {});
      
      setDishImages(imageMap);
    } catch (err) {
      console.error('Error fetching menu:', err);
      // Try public route as fallback
      try {
        console.log('Trying public menu items route...');
        const response = await api.get('/menu/public/items');
        console.log('Public menu items response:', response.data);
        setMenu(response.data);
        
        // Load images for fallback data too
        const imagePromises = response.data.map(async (item) => {
          const imageUrl = await fetchDishImage(item.title);
          return { id: item._id, imageUrl };
        });
        
        const images = await Promise.all(imagePromises);
        const imageMap = images.reduce((acc, { id, imageUrl }) => {
          acc[id] = imageUrl;
          return acc;
        }, {});
        
        setDishImages(imageMap);
      } catch (publicErr) {
        console.error('Error fetching public menu items:', publicErr);
      }
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const response = await api.get('/menu/categories');
      console.log('Categories response:', response.data);
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Try public route as fallback
      try {
        console.log('Trying public categories route...');
        const response = await api.get('/menu/public/categories');
        console.log('Public categories response:', response.data);
        setCategories(response.data);
      } catch (publicErr) {
        console.error('Error fetching public categories:', publicErr);
      }
    }
  };

  const fetchReservations = async () => {
    try {
      console.log('Fetching reservations...');
      const response = await api.get('/reservations');
      console.log('Reservations response:', response.data);
      setReservations(response.data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      console.log('Fetching top rated dishes...');
      const response = await api.get('/reviews/analytics/top-rated');
      console.log('Top rated dishes response:', response.data);
      setTopRatedDishes(response.data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        await api.delete(`/reservations/${reservationId}`);
        await fetchReservations(); // Refresh the list
        alert('Reservation cancelled successfully!');
      } catch (err) {
        console.error('Error cancelling reservation:', err);
        alert('Failed to cancel reservation');
      }
    }
  };

  const handleConfirmReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to confirm this reservation?')) {
      try {
        await api.patch(`/reservations/${reservationId}/confirm`);
        await fetchReservations(); // Refresh the list
        alert('Reservation confirmed successfully!');
      } catch (err) {
        console.error('Error confirming reservation:', err);
        alert('Failed to confirm reservation');
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchMenu(), fetchCategories(), fetchReservations(), fetchReviews()]);
      setLoading(false);
    };
    loadData();

    // Socket.IO event listeners for real-time updates
    socket.on('newReservation', (reservation) => {
      console.log('New reservation received:', reservation);
      setReservations(prev => [...prev, reservation]);
    });

    socket.on('updateReservation', (updatedReservation) => {
      console.log('Reservation updated:', updatedReservation);
      setReservations(prev => 
        prev.map(res => res._id === updatedReservation._id ? updatedReservation : res)
      );
    });

    socket.on('confirmReservation', (confirmedReservation) => {
      console.log('Reservation confirmed:', confirmedReservation);
      setReservations(prev => 
        prev.map(res => res._id === confirmedReservation._id ? confirmedReservation : res)
      );
    });

    socket.on('cancelReservation', (cancelledReservation) => {
      console.log('Reservation cancelled:', cancelledReservation);
      setReservations(prev => 
        prev.map(res => res._id === cancelledReservation._id ? cancelledReservation : res)
      );
    });

    // Listen for order updates
    socket.on('orders', (updatedOrders) => {
      console.log('Orders updated in admin dashboard:', updatedOrders);
      setOrders(updatedOrders);
    });

    // Load admin data from localStorage
    const storedAdminData = localStorage.getItem('admin-data');
    if (storedAdminData) {
      setAdminData(JSON.parse(storedAdminData));
    }

    // Cleanup function
    return () => {
      socket.off('newReservation');
      socket.off('updateReservation');
      socket.off('confirmReservation');
      socket.off('cancelReservation');
      socket.off('orders');
    };
  }, []);

  // Save admin data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('admin-data', JSON.stringify(adminData));
  }, [adminData]);

  // Category CRUD handlers
  const handleNewCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/menu/categories', {
        name: newCategoryForm.name,
        filter: newCategoryForm.filter,
        dishesPerCategory: parseInt(newCategoryForm.dishesPerCategory),
        description: newCategoryForm.description
      });
      setNewCategoryForm({ name: '', filter: '', dishesPerCategory: '', description: '' });
      setShowNewCategoryForm(false);
      await fetchCategories();
      alert('Category created successfully!');
    } catch (err) {
      console.error('Error creating category:', err);
      alert('Failed to create category');
    }
  };

  const handleEditCategoryClick = (category) => {
    setEditCategory(category._id);
    setEditCategoryForm({
      name: category.name,
      filter: category.filter,
      dishesPerCategory: category.dishesPerCategory.toString(),
      description: category.description
    });
  };

  const handleEditCategoryChange = (e) => {
    setEditCategoryForm({ ...editCategoryForm, [e.target.name]: e.target.value });
  };

  const handleEditCategorySave = async () => {
    try {
      await api.put(`/menu/categories/${editCategory}`, {
        name: editCategoryForm.name,
        filter: editCategoryForm.filter,
        dishesPerCategory: parseInt(editCategoryForm.dishesPerCategory),
        description: editCategoryForm.description
      });
      await fetchCategories();
      setEditCategory(null);
      alert('Category updated successfully!');
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category');
    }
  };

  const handleEditCategoryCancel = () => {
    setEditCategory(null);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This will also delete all menu items in this category.')) {
      try {
        await api.delete(`/menu/categories/${categoryId}`);
        await fetchMenu();
        await fetchCategories();
        alert('Category deleted successfully!');
      } catch (err) {
        console.error('Error deleting category:', err);
        alert('Failed to delete category');
      }
    }
  };

  // Menu item CRUD handlers
  const handleNewDishSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/menu/items', {
        categoryId: newDishForm.categoryId,
        title: newDishForm.title,
        price: parseFloat(newDishForm.price),
        description: newDishForm.description,
        image: newDishForm.image
      });
      setNewDishForm({ categoryId: '', title: '', price: '', description: '', image: '' });
      setShowNewDishForm(false);
      await fetchMenu();
      alert('Menu item created successfully!');
    } catch (err) {
      console.error('Error creating menu item:', err);
      alert('Failed to create menu item');
    }
  };

  const handleEditClick = (dish) => {
    setEditDish(dish._id);
    setEditForm({ 
      name: dish.title, 
      price: dish.price, 
      photo: dish.image, 
      description: dish.description 
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/menu/items/${editDish}`, {
        title: editForm.name,
        price: parseFloat(editForm.price),
        image: editForm.photo,
        description: editForm.description
      });
      await fetchMenu(); // Refresh menu data
      setEditDish(null);
      alert('Menu item updated successfully!');
    } catch (err) {
      console.error('Error updating menu item:', err);
      alert('Failed to update menu item');
    }
  };

  const handleEditCancel = () => {
    setEditDish(null);
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.delete(`/menu/items/${itemId}`);
        await fetchMenu(); // Refresh menu data
        alert('Menu item deleted successfully!');
      } catch (err) {
        console.error('Error deleting menu item:', err);
        alert('Failed to delete menu item');
      }
    }
  };

  // Handle dish name change for new dish form
  const handleNewDishNameChange = async (e) => {
    const title = e.target.value;
    setNewDishForm({ ...newDishForm, title });
    if (title) {
      const imgs = await fetchUnsplashImages(title);
      setUnsplashImages(imgs);
      if (imgs.length > 0) setNewDishForm((prev) => ({ ...prev, image: imgs[0] }));
    } else {
      setUnsplashImages([]);
    }
  };

  // Handle dish name change for edit form
  const handleEditDishNameChange = async (e) => {
    const name = e.target.value;
    setEditForm({ ...editForm, name });
    if (name) {
      const imgs = await fetchUnsplashImages(name);
      setUnsplashImages(imgs);
      if (imgs.length > 0) setEditForm((prev) => ({ ...prev, photo: imgs[0] }));
    } else {
      setUnsplashImages([]);
    }
  };

  // Handle custom image upload for new dish
  const handleNewDishImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDishForm((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle custom image upload for edit dish
  const handleEditDishImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev) => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Collapsible category toggle
  const toggleCategory = (catId) => {
    setOpenCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  // Pagination for dishes
  const filteredDishes = menu.filter(dish => dish.title.toLowerCase().includes(dishSearch.toLowerCase()));
  const totalDishPages = Math.ceil(filteredDishes.length / dishesPerPage);
  const paginatedDishes = filteredDishes.slice((dishPage - 1) * dishesPerPage, dishPage * dishesPerPage);

  const filteredChefOrders = orders.filter(order => order.status === 'accepted');
  const totalCustomerOrderPages = Math.ceil(orders.length / ordersPerPage);
  const totalChefOrderPages = Math.ceil(filteredChefOrders.length / ordersPerPage);
  const paginatedCustomerOrders = orders.slice((customerOrderPage - 1) * ordersPerPage, customerOrderPage * ordersPerPage);
  const paginatedChefOrders = filteredChefOrders.slice((chefOrderPage - 1) * ordersPerPage, chefOrderPage * ordersPerPage);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    );
  }

  return (
    <div>
      <header className="header-container">
        <div className="logo">
          <a href="#" onClick={() => window.scrollTo(0, 0)}>
            <img src="images/home.png" className="home-icon" alt="Home Icon" />
            South Indian Restaurant
          </a>
        </div>
        <div className="action-icons">
          <button type="button" onClick={onLogout}>Logout</button>
        </div>
      </header>
      <main>
        <h2>Admin Dashboard</h2>
        <p>Welcome, Admin! This is your dashboard for managing the restaurant.</p>

  {/* Reservations Section */}
        <section style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Table Reservations ({reservations.length})</h3>
            <button 
              onClick={() => fetchReservations()} 
              style={{ 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              Refresh
            </button>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {reservations.length === 0 ? (
              <li style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px' }}>
                No reservations found.
              </li>
            ) : (
              reservations.map(reservation => (
                <li key={reservation._id} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: 8, 
                  margin: '10px 0', 
                  padding: 15, 
                  position: 'relative',

                  opacity: reservation.status === 'cancelled' ? 0.7 : 1
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <b>Guest Name:</b> {reservation.guestName} <br />
                      <b>Email:</b> {reservation.email} <br />
                      <b>Phone:</b> {reservation.phone} <br />
                      <b>Table Number:</b> {reservation.tableNumber} <br />
                    </div>
                    <div>
                      <b>Party Size:</b> {reservation.partySize || reservation.numberOfGuests} guests <br />
                      <b>Date:</b> {new Date(reservation.date || reservation.reservationDate).toLocaleDateString()} <br />
                      <b>Time:</b> {reservation.time || reservation.reservationTime} <br />
                      <b>Status:</b> <span style={{ 
                        color: reservation.status === 'cancelled' ? '#dc3545' : 
                               reservation.status === 'confirmed' ? '#28a745' : '#ffc107',
                        fontWeight: 'bold'
                      }}>{reservation.status || 'pending'}</span> <br />
                      <b>Reserved On:</b> {new Date(reservation.createdAt).toLocaleString()} <br />
                    </div>
                  </div>
                  {reservation.specialRequests && (
                    <div style={{ marginTop: '10px', padding: '8px', borderRadius: '4px' }}>
                      <b>Special Requests:</b> {reservation.specialRequests}
                    </div>
                  )}
                  <div style={{ 
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    display: 'flex',
                    gap: '5px'
                  }}>
                    {reservation.status === 'pending' && (
                      <button 
                        onClick={() => handleConfirmReservation(reservation._id)}
                        style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          border: 'none', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Accept
                      </button>
                    )}
                    {reservation.status !== 'cancelled' && (
                      <button 
                        onClick={() => handleDeleteReservation(reservation._id)}
                        style={{ 
                          backgroundColor: '#dc3545', 
                          color: 'white', 
                          border: 'none', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Order History Section */}
        <section style={{ marginTop: 30 }}>
          <h3>All Customer Orders ({orders.length})</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {orders.length === 0 ? (
              <li>No orders found.</li>
            ) : (
              paginatedCustomerOrders.map(order => (
                <li key={order._id} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '10px 0', padding: 15 }}>
                  <b>Customer:</b> Table {order.tableNumber} <br />
                  <b>Status:</b> {order.status} <br />
                  <b>Chef:</b> {order.chefId?.email || 'N/A'} <br />
                  <b>Total Amount:</b> {formatINR(order.totalAmount || 0)} <br />
                  <b>Date:</b> {new Date(order.createdAt).toLocaleString()} <br />
                  <b>Items:</b>
                  <ul>
                    {order.items.map((item, idx) => (
                      <li key={idx}>{item.title} - {formatINR(item.price)} {item.note && `(Note: ${item.note})`}</li>
                    ))}
                  </ul>
                </li>
              ))
            )}
          </ul>
          {/* Pagination Controls for Customer Orders */}
          {orders.length > ordersPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
              <button onClick={() => setCustomerOrderPage(p => Math.max(1, p - 1))} disabled={customerOrderPage === 1}>Prev</button>
              <span style={{ margin: '0 10px' }}>Page {customerOrderPage} of {totalCustomerOrderPages}</span>
              <button onClick={() => setCustomerOrderPage(p => Math.min(totalCustomerOrderPages, p + 1))} disabled={customerOrderPage === totalCustomerOrderPages}>Next</button>
            </div>
          )}
        </section>


        {/* Chef Accepted Orders Section */}
        <section style={{ marginTop: 30 }}>
          <h3>Orders Accepted by Chefs</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {filteredChefOrders.length === 0 && <li>No orders accepted by chefs.</li>}
            {paginatedChefOrders.map(order => (
              <li key={order._id} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '10px 0', padding: 15  }}>
                <b>Customer:</b> Table {order.tableNumber} <br />
                <b>Status:</b> {order.status} <br />
                <b>Chef:</b> {order.chefId?.email || 'N/A'} <br />
                <b>Total Amount:</b> {formatINR(order.totalAmount || 0)} <br />
                <b>Date:</b> {new Date(order.createdAt).toLocaleString()} <br />
                <b>Items:</b>
                <ul>
                  {order.items.map((item, idx) => (
                    <li key={idx}>{item.title} - {formatINR(item.price)} {item.note && `(Note: ${item.note})`}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {/* Pagination Controls for Chef Orders */}
          {filteredChefOrders.length > ordersPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
              <button onClick={() => setChefOrderPage(p => Math.max(1, p - 1))} disabled={chefOrderPage === 1}>Prev</button>
              <span style={{ margin: '0 10px' }}>Page {chefOrderPage} of {totalChefOrderPages}</span>
              <button onClick={() => setChefOrderPage(p => Math.min(totalChefOrderPages, p + 1))} disabled={chefOrderPage === totalChefOrderPages}>Next</button>
            </div>
          )}
        </section>

  {/* Analytics Dashboard Section (with charts) */}
  <AnalyticsCharts orders={orders} />

        {/* Reviews Section */}
        <section style={{ marginTop: 30, borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3>Customer Reviews & Top Rated Dishes</h3>
            <button 
              onClick={fetchReviews}
              style={{ 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              Refresh Reviews
            </button>
          </div>
          
          {topRatedDishes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
              <h4>No Reviews Yet</h4>
              <p>Encourage customers to leave reviews for your delicious dishes!</p>
            </div>
          ) : (
            <div>
              <h4 style={{ marginBottom: 15 }}>Top Rated Dishes</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {topRatedDishes.map((dish, index) => (
                  <div 
                    key={dish.dishId} 
                    style={{ 
                      border: '1px solid #dee2e6', 
                      borderRadius: 8, 
                      padding: 15,
                      background: index === 0 ? '#fff3cd' : '#fff',
                      position: 'relative'
                    }}
                  >
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: -10,
                        right: 10,
                        background: '#ffc107',
                        color: '#212529',
                        padding: '5px 10px',
                        borderRadius: 15,
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        🏆 #1 Rated
                      </div>
                    )}
                    <h5 style={{ margin: 0, marginBottom: 10, color: '#495057' }}>
                      {dish.title}
                    </h5>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 20, color: '#ffc107' }}>
                        {'⭐'.repeat(Math.round(dish.avgRating))}
                      </span>
                      <span style={{ marginLeft: 8, fontWeight: 'bold', color: '#28a745' }}>
                        {dish.avgRating.toFixed(1)}/5.0
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                      Based on {dish.reviewCount} review{dish.reviewCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Menu Categories Section */}
        <section style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Menu Categories ({categories.length})</h3>
            <button 
              onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
              style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              {showNewCategoryForm ? 'Cancel' : 'Add New Category'}
            </button>
          </div>

          {/* New Category Form */}
          {showNewCategoryForm && (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 15, margin: '10px 0' }}>
              <h4>Add New Category</h4>
              <form onSubmit={handleNewCategorySubmit}>
                <input
                  name="name"
                  value={newCategoryForm.name}
                  onChange={(e) => setNewCategoryForm({...newCategoryForm, name: e.target.value})}
                  placeholder="Category Name"
                  required
                  style={{ margin: '5px', padding: '8px', width: '200px' }}
                />
                <input
                  name="filter"
                  value={newCategoryForm.filter}
                  onChange={(e) => setNewCategoryForm({...newCategoryForm, filter: e.target.value})}
                  placeholder="Filter (e.g., maincourses)"
                  required
                  style={{ margin: '5px', padding: '8px', width: '200px' }}
                />
                <input
                  name="dishesPerCategory"
                  type="number"
                  value={newCategoryForm.dishesPerCategory}
                  onChange={(e) => setNewCategoryForm({...newCategoryForm, dishesPerCategory: e.target.value})}
                  placeholder="Dishes per category"
                  required
                  style={{ margin: '5px', padding: '8px', width: '150px' }}
                />
                <input
                  name="description"
                  value={newCategoryForm.description}
                  onChange={(e) => setNewCategoryForm({...newCategoryForm, description: e.target.value})}
                  placeholder="Description"
                  style={{ margin: '5px', padding: '8px', width: '300px' }}
                />
                <button type="submit" style={{ margin: '5px', padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none' }}>
                  Create Category
                </button>
              </form>
            </div>
          )}

          {/* Category Search Bar */}
          <div className="admin-search-bar">
            <input
              type="text"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
            />
          </div>

          {/* Collapsible Category List */}
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 4 }}>
            {categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => (
              <div key={cat._id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 8, borderRadius: 4 }} onClick={() => toggleCategory(cat._id)}>
                  <span style={{ fontWeight: 'bold', flex: 1 }}>{cat.name}</span>
                  <span>{openCategoryIds.includes(cat._id) ? '▲' : '▼'}</span>
                </div>
                {openCategoryIds.includes(cat._id) && (
                  <div style={{ padding: 8, border: '1px solid #eee', borderRadius: 4, marginTop: 4 }}>
                    {editCategory === cat._id ? (
                      <div>
                        <input 
                          name="name" 
                          value={editCategoryForm.name} 
                          onChange={handleEditCategoryChange} 
                          placeholder="Name" 
                          style={{ margin: '5px', padding: '5px', width: '200px' }}
                        />
                        <input 
                          name="filter" 
                          value={editCategoryForm.filter} 
                          onChange={handleEditCategoryChange} 
                          placeholder="Filter" 
                          style={{ margin: '5px', padding: '5px', width: '150px' }}
                        />
                        <input 
                          name="dishesPerCategory" 
                          type="number"
                          value={editCategoryForm.dishesPerCategory} 
                          onChange={handleEditCategoryChange} 
                          placeholder="Dishes per category" 
                          style={{ margin: '5px', padding: '5px', width: '150px' }}
                        />
                        <input 
                          name="description" 
                          value={editCategoryForm.description} 
                          onChange={handleEditCategoryChange} 
                          placeholder="Description" 
                          style={{ margin: '5px', padding: '5px', width: '300px' }}
                        />
                        <button onClick={handleEditCategorySave} style={{ margin: '5px', padding: '5px 10px' }}>Save</button>
                        <button onClick={handleEditCategoryCancel} style={{ margin: '5px', padding: '5px 10px' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <b>Name:</b> {cat.name} <br />
                          <b>Filter:</b> {cat.filter} <br />
                          <b>Dishes Per Category:</b> {cat.dishesPerCategory} <br />
                          <b>Description:</b> {cat.description || 'No description'}
                        </div>
                        <button onClick={() => handleEditCategoryClick(cat)} style={{ marginLeft: 10, padding: '5px 10px' }}>Edit</button>
                        <button onClick={() => handleDeleteCategory(cat._id)} style={{ marginLeft: 5, padding: '5px 10px', backgroundColor: '#ff4444', color: 'white', border: 'none' }}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Menu Edit Section */}
        <section style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Edit Menu Dishes ({menu.length})</h3>
            <button 
              onClick={() => setShowNewDishForm(!showNewDishForm)}
              style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              {showNewDishForm ? 'Cancel' : 'Add New Dish'}
            </button>
          </div>

          {/* New Dish Form */}
          {showNewDishForm && (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 15, margin: '10px 0' }}>
              <h4>Add New Menu Item</h4>
              <form onSubmit={handleNewDishSubmit}>
                <select
                  name="categoryId"
                  value={newDishForm.categoryId}
                  onChange={(e) => setNewDishForm({...newDishForm, categoryId: e.target.value})}
                  required
                  style={{ margin: '5px', padding: '8px', width: '200px' }}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="title"
                  value={newDishForm.title}
                  onChange={handleNewDishNameChange}
                  placeholder="Dish Name"
                  required
                />
                {/* Images section for related Unsplash images */}
                {unsplashImages.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                    {unsplashImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Related ${newDishForm.title}`}
                        style={{ width: 60, height: 60, objectFit: 'cover', border: newDishForm.image === img ? '2px solid #4CAF50' : '2px solid #ccc', cursor: 'pointer', borderRadius: 4 }}
                        onClick={() => setNewDishForm((prev) => ({ ...prev, image: img }))}
                      />
                    ))}
                  </div>
                )}
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  value={newDishForm.price}
                  onChange={(e) => setNewDishForm({...newDishForm, price: e.target.value})}
                  placeholder="Price"
                  required
                  style={{ margin: '5px', padding: '8px', width: '100px' }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewDishImageUpload}
                />
                <input
                  name="description"
                  value={newDishForm.description}
                  onChange={(e) => setNewDishForm({...newDishForm, description: e.target.value})}
                  placeholder="Description"
                  required
                  style={{ margin: '5px', padding: '8px', width: '300px' }}
                />
                <button type="submit" style={{ margin: '5px', padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none' }}>
                  Create Dish
                </button>
              </form>
            </div>
          )}

          {/* Dish Search Bar */}
          <div className="admin-search-bar">
            <input
              type="text"
              placeholder="Search dishes..."
              value={dishSearch}
              onChange={e => setDishSearch(e.target.value)}
            />
          </div>

          {/* Paginated Dish List */}
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 4 }}>
            {paginatedDishes.map(dish => (
              <li key={dish._id} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '10px 0', padding: 15 }}>
                {editDish === dish._id ? (
                  <div>
                    <input 
                      name="name" 
                      value={editForm.name} 
                      onChange={handleEditChange} 
                      placeholder="Name" 
                      style={{ margin: '5px', padding: '5px', width: '200px' }}
                    />
                    {/* Images section for related Unsplash images */}
                    {unsplashImages.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                        {unsplashImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Related ${editForm.name}`}
                            style={{ width: 60, height: 60, objectFit: 'cover', border: editForm.photo === img ? '2px solid #4CAF50' : '2px solid #ccc', cursor: 'pointer', borderRadius: 4 }}
                            onClick={() => setEditForm((prev) => ({ ...prev, photo: img }))}
                          />
                        ))}
                      </div>
                    )}
                    <input 
                      name="price" 
                      type="number" 
                      value={editForm.price} 
                      onChange={handleEditChange} 
                      placeholder="Price" 
                      style={{ margin: '5px', padding: '5px', width: '100px' }}
                    />
                    <input 
                      name="description" 
                      value={editForm.description} 
                      onChange={handleEditChange} 
                      placeholder="Description" 
                      style={{ margin: '5px', padding: '5px', width: '300px' }}
                    />
                    <button onClick={handleEditSave} style={{ margin: '5px', padding: '5px 10px' }}>Save</button>
                    <button onClick={handleEditCancel} style={{ margin: '5px', padding: '5px 10px' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 60, height: 60, marginRight: 10, overflow: 'hidden', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {dishImages[dish._id] ? (
                        <img 
                          src={dishImages[dish._id]} 
                          alt={dish.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.src = dish.image || '/default-dish.png';
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '10px', textAlign: 'center', color: '#666' }}>Loading...</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <b>{dish.title}</b> - {formatINR(dish.price)} <br />
                      <span>{dish.description}</span> <br />
                      <small>Category: {dish.categoryId?.name || 'Unknown'}</small>
                    </div>
                    <button onClick={() => handleEditClick(dish)} style={{ marginLeft: 10, padding: '5px 10px' }}>Edit</button>
                    <button onClick={() => handleDeleteItem(dish._id)} style={{ marginLeft: 5, padding: '5px 10px', backgroundColor: '#ff4444', color: 'white', border: 'none' }}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
            <button onClick={() => setDishPage(p => Math.max(1, p - 1))} disabled={dishPage === 1}>Prev</button>
            <span style={{ margin: '0 10px' }}>Page {dishPage} of {totalDishPages}</span>
            <button onClick={() => setDishPage(p => Math.min(totalDishPages, p + 1))} disabled={dishPage === totalDishPages}>Next</button>
          </div>
        </section>
      </main>
      <footer>
        <p>© 2024 Restaurant Name | All Rights Reserved</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;