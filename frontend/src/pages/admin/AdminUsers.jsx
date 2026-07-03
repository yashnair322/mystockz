import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import api, { friendlyError } from '../../utils/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');



  const toggleUserStatus = async (id) => {
    try {
      const res = await api.post(`/admin/users/${id}/toggle-status`);
      if (res.data.success) {
        setUsers(users.map(u => {
          if (u.id === id) return { ...u, is_active: !u.is_active };
          return u;
        }));
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
      alert(friendlyError(err, 'We could not update the user status. Please try again.'));
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function fetchUsers() {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2><Users className="inline-icon" /> User Management</h2>
          <p>Manage registered users and their account status.</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="search-bar" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Search size={18} style={{ marginRight: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
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
                  <th>ID</th>
                  <th>User</th>
                  <th>Joined</th>
                  <th>Purchases</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>No users found.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{u.username}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{u.email}</div>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>{u.purchases_count || 0}</td>
                      <td>
                        <span className={`status-badge ${u.is_active ? 'approved' : 'rejected'}`}>
                          {u.is_active ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => toggleUserStatus(u.id)}
                          className={u.is_active ? "btn-danger" : "btn-success"}
                          style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'white', background: u.is_active ? '#ef4444' : '#10b981' }}
                        >
                          {u.is_active ? 'Ban' : 'Unban'}
                        </button>
                      </td>
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

export default AdminUsers;
