import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api, { friendlyError } from '../utils/api';
import { Clock, CheckCircle, AlertCircle, Save, PlayCircle } from 'lucide-react';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [tvId, setTvId] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' });
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Profile update state
  const [profileData, setProfileData] = useState({ first_name: '', last_name: '', email: '', tradingview_id: '', current_password: '' });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        tradingview_id: user.tradingview_id || '',
        current_password: ''
      });
      fetchPurchases();
      fetchDemoRequests();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
      const res = await api.get('/user/purchases');
      if (res.data.success) {
        setPurchases(res.data.purchases);
      }
    } catch (err) {
      console.error("Failed to fetch purchases", err);
    } finally {
      setFetching(false);
    }
  };

  const fetchDemoRequests = async () => {
    try {
      const res = await api.get('/demo-requests/mine');
      if (res.data.success) {
        setDemoRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch demo requests", err);
    }
  };

  const updateTradingViewId = async (id) => {
    try {
      const res = await api.post(`/user/tradingview-id/${id}`, { tradingview_id: tvId });
      if (res.data.success) {
        setEditingId(null);
        fetchPurchases();
      }
    } catch (err) {
      alert(friendlyError(err, 'We could not update your TradingView ID. Please try again.'));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMessage({ type: '', text: '' });
    setIsChangingPwd(true);
    try {
      const res = await api.post('/user/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      if (res.data.success) {
        setPwdMessage({ type: 'success', text: 'Password updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPwdMessage({ type: 'error', text: friendlyError({ response: { data: res.data } }, 'We could not change your password. Please try again.') });
      }
    } catch (err) {
      setPwdMessage({ type: 'error', text: friendlyError(err, 'We could not change your password. Please try again.') });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setIsUpdatingProfile(true);
    try {
      const res = await api.post('/user/profile', profileData);
      if (res.data.success) {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setProfileMsg({ type: 'error', text: friendlyError({ response: { data: res.data } }, 'We could not update your profile. Please try again.') });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: friendlyError(err, 'We could not update your profile. Please try again.') });
    } finally {
      setIsUpdatingProfile(false);
    }
  };


  if (loading) return <div className="loader-container"><div className="loader"></div></div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="dashboard-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-header"
      >
        <h2>Welcome Back, {user.first_name || user.username}!</h2>
        <p>Manage your active subscriptions and TradingView details.</p>
      </motion.div>
      
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        <div className="profile-settings-section">
          <h3>Profile Settings</h3>
          <div className="header-line" style={{ marginBottom: '2rem' }}></div>
          
          <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* General Profile Card */}
            <div className="profile-card" style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>General Details</h4>
              
              {profileMsg.text && (
                <div className={`alert ${profileMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', background: profileMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: profileMsg.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${profileMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="first_name">First Name</label>
                    <input 
                      type="text" 
                      id="first_name"
                      value={profileData.first_name} 
                      onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                      className="auth-input"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name</label>
                    <input 
                      type="text" 
                      id="last_name"
                      value={profileData.last_name} 
                      onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                      className="auth-input"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input 
                    type="email" 
                    id="email"
                    value={profileData.email} 
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="auth-input"
                    required
                    autoComplete="email"
                  />
                </div>

                {!user.is_admin && (
                  <div className="form-group">
                    <label htmlFor="tradingview_id">TradingView Username</label>
                    <input 
                      type="text" 
                      id="tradingview_id"
                      value={profileData.tradingview_id} 
                      onChange={(e) => setProfileData({...profileData, tradingview_id: e.target.value})}
                      className="auth-input"
                      autoComplete="username"
                    />
                  </div>
                )}

                {/* Only show password field if email actually changed */}
                {profileData.email !== user.email && (
                  <div className="form-group" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                    <label htmlFor="current_password" style={{ color: '#ef4444' }}>Current Password (Required for Email Change)</label>
                    <input 
                      type="password" 
                      id="current_password"
                      value={profileData.current_password} 
                      onChange={(e) => setProfileData({...profileData, current_password: e.target.value})}
                      className="auth-input"
                      required={profileData.email !== user.email}
                      autoComplete="current-password"
                    />
                  </div>
                )}

                <button type="submit" className="primary-btn" disabled={isUpdatingProfile} style={{ marginTop: '0.5rem' }}>
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* Password Change Card */}
            <div className="profile-card" style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Change Password</h4>
              
              {pwdMessage.text && (
                <div className={`alert ${pwdMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', background: pwdMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: pwdMessage.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${pwdMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                  {pwdMessage.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="current-password-change">Current Password</label>
                  <input 
                    type="password" 
                    id="current-password-change"
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="auth-input"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-password-change">New Password</label>
                  <input 
                    type="password" 
                    id="new-password-change"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="auth-input"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="primary-btn" disabled={isChangingPwd} style={{ marginTop: '0.5rem' }}>
                  {isChangingPwd ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {!user.is_admin && (
          <div className="demo-requests-section">
            <h3><PlayCircle size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#f472b6' }} />My Demo Requests</h3>
            <div className="header-line" style={{ marginBottom: '1.5rem' }}></div>
            {demoRequests.length === 0 ? (
              <div style={{
                background: 'rgba(15,23,42,0.5)',
                padding: '1.25rem 1.5rem',
                borderRadius: '12px',
                border: '1px dashed rgba(255,255,255,0.12)',
                color: 'var(--text-secondary)',
              }}>
                You haven&apos;t requested a demo yet. Visit <a href="/resources" style={{ color: '#a78bfa' }}>Resources</a> to try one.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {demoRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      background: 'rgba(15,23,42,0.55)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong>{req.script_name || 'Platform-wide demo'}</strong>
                      <span className={`status-badge ${req.status}`}>{req.status}</span>
                    </div>
                    {req.message && (
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {req.message}
                      </p>
                    )}
                    {req.admin_notes && (
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#c4b5fd' }}>
                        <strong>Note from team:</strong> {req.admin_notes}
                      </p>
                    )}
                    <small style={{ color: 'var(--text-secondary)' }}>
                      Requested {new Date(req.created_at).toLocaleString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="purchases-section">
          <h3>My Subscriptions</h3>
          <div className="header-line" style={{ marginBottom: '2rem' }}></div>
          
          {fetching ? (
            <div className="loader-container"><div className="loader"></div></div>
          ) : purchases.length === 0 ? (
            <div className="empty-purchases">
              <p>You haven't purchased any indicators yet.</p>
            </div>
          ) : (
            <div className="purchases-grid">
              {purchases.map(purchase => (
                <motion.div 
                  key={purchase.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`purchase-card ${purchase.is_expired ? 'expired' : ''}`}
                >
                  <div className="purchase-header">
                    <h4>{purchase.script_name}</h4>
                    <span className={`status-badge ${purchase.approval_status}`}>
                      {purchase.approval_status === 'approved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                      {purchase.approval_status}
                    </span>
                  </div>
                  
                  <div className="purchase-details">
                    <p><strong>Plan:</strong> <span style={{textTransform: 'capitalize'}}>{purchase.subscription_type}</span></p>
                    <p>
                      <strong>Expires:</strong> 
                      <span className={purchase.is_expired ? 'text-red' : ''}>
                        {purchase.expires_at ? new Date(purchase.expires_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </p>
                  </div>

                  <div className="tv-id-section">
                    <label>TradingView ID:</label>
                    {editingId === purchase.id ? (
                      <div className="tv-id-edit">
                        <input 
                          type="text" 
                          value={tvId} 
                          onChange={(e) => setTvId(e.target.value)}
                          placeholder="Enter ID"
                        />
                        <button onClick={() => updateTradingViewId(purchase.id)} className="save-btn">
                          <Save size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="tv-id-display">
                        <span>{purchase.tradingview_id || 'Not set'}</span>
                        <button onClick={() => { setEditingId(purchase.id); setTvId(purchase.tradingview_id || ''); }} className="edit-link">
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
