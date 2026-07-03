import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, DollarSign, CheckCircle, PlayCircle } from 'lucide-react';
import api from '../../utils/api';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);




  async function fetchDashboard() {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin dashboard", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;
  if (!data) return <div>Failed to load dashboard data</div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Dashboard Overview</h1>
        <p>Monitor your platform's key metrics.</p>
      </div>

      <div className="admin-stats-grid">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="admin-stat-card">
          <div className="stat-icon users"><Users size={24} /></div>
          <div className="stat-details">
            <h3>Total Users</h3>
            <p>{data.stats.user_count}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="admin-stat-card">
          <div className="stat-icon revenue"><DollarSign size={24} /></div>
          <div className="stat-details">
            <h3>Total Revenue</h3>
            <p>₹{data.stats.total_revenue.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="admin-stat-card">
          <div className="stat-icon orders"><ShoppingBag size={24} /></div>
          <div className="stat-details">
            <h3>Completed Orders</h3>
            <p>{data.stats.order_count}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="admin-stat-card">
          <div className="stat-icon approvals"><CheckCircle size={24} /></div>
          <div className="stat-details">
            <h3>Pending Approvals</h3>
            <p>{data.stats.pending_approvals}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="admin-stat-card">
          <div className="stat-icon approvals"><PlayCircle size={24} /></div>
          <div className="stat-details">
            <h3>Pending Demos</h3>
            <p>{data.stats.pending_demo_requests ?? 0}</p>
          </div>
        </motion.div>
      </div>

      <div className="admin-recent-section">
        <h2>Recent Orders</h2>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_orders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.user}</td>
                  <td>₹{order.amount}</td>
                  <td>
                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                  </td>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.recent_orders.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">No recent orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
