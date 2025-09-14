import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import TableReservation from './TableReservation';
import fetchDishImage from '../utils/unsplash';
import './GuestDashboard.css';

const GuestDashboard = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReservation, setShowReservation] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [itemImages, setItemImages] = useState({});

    useEffect(() => {
        fetchMenuData();
    }, []);

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

            {showReservation ? (
                <TableReservation />
            ) : (
                <div className="menu-section">
                    <div className="menu-filters">
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="category-filter"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(category => (
                                <option key={category._id} value={category.filter}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

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
                                                        <span className="price">₹{item.price}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestDashboard;