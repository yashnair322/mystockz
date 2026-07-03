import { useState, useEffect } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import api from '../../utils/api';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');



  const filteredOrders = orders.filter(o => 
    o.id.toString().includes(searchTerm) || 
    o.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.razorpay_order_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function fetchOrders() {
    try {
      const res = await api.get('/admin/orders');
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2><ShoppingBag className="inline-icon" /> Orders History</h2>
          <p>View all transactions and payments.</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="search-bar" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Search size={18} style={{ marginRight: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search by Order ID, Username, or Razorpay ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment ID</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>No orders found.</td></tr>
                ) : (
                  filteredOrders.map(o => (
                    <tr key={o.id}>
                      <td><strong>#{o.id}</strong></td>
                      <td>
                        <div>{o.user_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{o.user_email}</div>
                      </td>
                      <td style={{ fontWeight: 'bold' }}>₹{o.amount}</td>
                      <td>
                        <span className={`status-badge ${o.status === 'completed' ? 'approved' : o.status === 'pending' ? 'pending' : 'rejected'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        {o.razorpay_payment_id || 'N/A'}
                      </td>
                      <td>{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
