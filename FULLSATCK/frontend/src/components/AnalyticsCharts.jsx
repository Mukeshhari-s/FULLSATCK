import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../utils/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsCharts = ({ orders = [] }) => {
  const [serverAnalytics, setServerAnalytics] = useState(null);
  const [error, setError] = useState('');

  // Optional: still try server-side aggregated analytics as a fallback
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics');
        setServerAnalytics(response.data);
      } catch (err) {
        // silent fallback; we compute client-side anyway
        setServerAnalytics(null);
      }
    };
    fetchAnalytics();
  }, []);

  // INR currency formatter
  const formatINR = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  // Helper to get start/end of today
  const getTodayBounds = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // Mock seed if there’s no data
  const mockOrders = useMemo(() => ([
    {
      _id: 'm1',
      tableNumber: 3,
      status: 'completed',
      totalAmount: 420,
      createdAt: new Date().toISOString(),
      items: [
        { title: 'Masala Dosa', price: 120 },
        { title: 'Idli Sambar', price: 80 },
        { title: 'Filter Coffee', price: 50 }
      ]
    },
    {
      _id: 'm2',
      tableNumber: 7,
      status: 'completed',
      totalAmount: 300,
      createdAt: new Date().toISOString(),
      items: [
        { title: 'Plain Dosa', price: 100 },
        { title: 'Vada', price: 60 },
        { title: 'Filter Coffee', price: 50 }
      ]
    },
    {
      _id: 'm3',
      tableNumber: 5,
      status: 'accepted',
      totalAmount: 200,
      createdAt: new Date().toISOString(),
      items: [
        { title: 'Pongal', price: 120 },
        { title: 'Filter Coffee', price: 50 }
      ]
    }
  ]), []);

  const todayAnalytics = useMemo(() => {
    try {
      const { start, end } = getTodayBounds();
      const src = orders && orders.length > 0 ? orders : mockOrders;

      // Filter to today’s orders
      const todays = src.filter(o => {
        const ts = new Date(o.createdAt).getTime();
        return ts >= start.getTime() && ts <= end.getTime();
      });

      // Totals
      const totalSales = todays.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalOrders = todays.length;

      // Popular dishes
      const dishCounts = new Map();
      todays.forEach(o => (o.items || []).forEach(it => {
        const key = it.title || it.name || 'Unknown';
        dishCounts.set(key, (dishCounts.get(key) || 0) + 1);
      }));
      const popularDishes = Array.from(dishCounts.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Peak hours
      const hourCounts = new Map();
      todays.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      });
      const peakHours = Array.from(hourCounts.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Top customers by table
      const tableAgg = new Map();
      todays.forEach(o => {
        const t = o.tableNumber;
        const current = tableAgg.get(t) || { orders: 0, totalSpent: 0 };
        tableAgg.set(t, { orders: current.orders + 1, totalSpent: current.totalSpent + (o.totalAmount || 0) });
      });
      const topCustomers = Array.from(tableAgg.entries())
        .map(([tableNumber, v]) => ({ tableNumber, orders: v.orders, totalSpent: v.totalSpent }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      return { totalSales, totalOrders, popularDishes, peakHours, topCustomers };
    } catch (e) {
      setError('Failed to compute analytics');
      return null;
    }
  }, [orders, mockOrders]);

  if (!todayAnalytics) return <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>{error || 'No analytics data available'}</div>;

  // Prepare data for charts (client-side analytics)
  const popularDishesData = todayAnalytics.popularDishes?.map(dish => ({ name: dish.title, orders: dish.count })) || [];
  const peakHoursData = todayAnalytics.peakHours?.map(h => ({ hour: `${h.hour}:00`, orders: h.count })) || [];
  const topCustomersData = todayAnalytics.topCustomers?.map(c => ({ table: `Table ${c.tableNumber}`, spent: c.totalSpent, orders: c.orders })) || [];

  return (
    <section style={{ marginTop: 30, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24 }}>
      <h2>Restaurant Analytics Dashboard</h2>
      
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#28a745' }}>Total Sales (Today)</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold', margin: 10, color: '#28a745' }}>
            {formatINR(todayAnalytics.totalSales || 0)}
          </p>
          <p style={{ margin: 0, color: '#6c757d' }}>{todayAnalytics.totalOrders || 0} orders</p>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#007bff' }}>Popular Dishes (Top 5)</h3>
          <p style={{ fontSize: 24, fontWeight: 'bold', margin: 10, color: '#007bff' }}>{popularDishesData.length}</p>
          <p style={{ margin: 0, color: '#6c757d' }}>different dishes ordered</p>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#ffc107' }}>Peak Hours (Today)</h3>
          <p style={{ fontSize: 24, fontWeight: 'bold', margin: 10, color: '#ffc107' }}>
            {peakHoursData?.[0]?.hour || 'N/A'}
          </p>
          <p style={{ margin: 0, color: '#6c757d' }}>busiest hour</p>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#dc3545' }}>Top Customers (Today)</h3>
          <p style={{ fontSize: 24, fontWeight: 'bold', margin: 10, color: '#dc3545' }}>{topCustomersData.length}</p>
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
                  label={({ table, spent }) => `${table}: ${formatINR(spent)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="spent"
                >
                  {topCustomersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatINR(value), 'Amount Spent']} />
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
          <h3>No Orders Today</h3>
          <p>Showing mock data for demo. Place orders to see today’s live analytics.</p>
        </div>
      )}
    </section>
  );
};

export default AnalyticsCharts;
