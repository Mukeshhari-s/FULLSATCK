import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../utils/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsCharts = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await api.get('/analytics');
        console.log('Analytics data:', response.data);
        setAnalytics(response.data);
        setError('');
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Failed to load analytics data. Please check if orders exist.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading analytics...</div>;
  if (error) return <div style={{ color: 'red', padding: 20, textAlign: 'center' }}>{error}</div>;
  if (!analytics) return <div style={{ padding: 20, textAlign: 'center' }}>No analytics data available</div>;

  // Prepare data for charts
  const popularDishesData = analytics.popularDishes?.map(dish => ({
    name: dish.title,
    orders: dish.count
  })) || [];

  const peakHoursData = analytics.peakHours?.map(h => ({
    hour: `${h.hour}:00`,
    orders: h.count
  })) || [];

  const topCustomersData = analytics.topCustomers?.map(c => ({
    table: `Table ${c.tableNumber}`,
    spent: c.totalSpent,
    orders: c.orders
  })) || [];

  return (
    <section style={{ marginTop: 30, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24 }}>
      <h2>Restaurant Analytics Dashboard</h2>
      
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#28a745' }}>Total Sales</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold', margin: 10, color: '#28a745' }}>
            ${analytics.totalSales?.toFixed(2) || '0.00'}
          </p>
          <p style={{ margin: 0, color: '#6c757d' }}>{analytics.totalOrders || 0} orders</p>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#007bff' }}>Popular Dishes</h3>
          <p style={{ fontSize: 24, fontWeight: 'bold', margin: 10, color: '#007bff' }}>
            {analytics.popularDishes?.length || 0}
          </p>
          <p style={{ margin: 0, color: '#6c757d' }}>different dishes ordered</p>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#ffc107' }}>Peak Hours</h3>
          <p style={{ fontSize: 24, fontWeight: 'bold', margin: 10, color: '#ffc107' }}>
            {analytics.peakHours?.[0]?.hour || 'N/A'}:00
          </p>
          <p style={{ margin: 0, color: '#6c757d' }}>busiest hour</p>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#dc3545' }}>Top Customers</h3>
          <p style={{ fontSize: 24, fontWeight: 'bold', margin: 10, color: '#dc3545' }}>
            {analytics.topCustomers?.length || 0}
          </p>
          <p style={{ margin: 0, color: '#6c757d' }}>regular customers</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 30 }}>
        
        {/* Popular Dishes Bar Chart */}
        {popularDishesData.length > 0 && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #dee2e6' }}>
            <h3 style={{ marginBottom: 20 }}>Popular Dishes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={popularDishesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>

          </div>
        )}

        {/* Peak Hours Line Chart */}
        {peakHoursData.length > 0 && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #dee2e6' }}>
            <h3 style={{ marginBottom: 20 }}>Peak Hours</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Customers Pie Chart */}
        {topCustomersData.length > 0 && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #dee2e6' }}>
            <h3 style={{ marginBottom: 20 }}>Top Customers by Spending</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topCustomersData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ table, spent }) => `${table}: $${spent.toFixed(2)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="spent"
                >
                  {topCustomersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount Spent']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Customer Orders Bar Chart */}
        {topCustomersData.length > 0 && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #dee2e6' }}>
            <h3 style={{ marginBottom: 20 }}>Customer Order Frequency</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="table" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Empty State */}
      {popularDishesData.length === 0 && peakHoursData.length === 0 && topCustomersData.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
          <h3>No Analytics Data Available</h3>
          <p>Place some orders to see analytics charts and insights!</p>
        </div>
      )}
    </section>
  );
};

export default AnalyticsCharts;
