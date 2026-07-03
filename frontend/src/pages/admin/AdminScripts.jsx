import { useState, useEffect } from 'react';
import { FileCode, Plus, Edit2 } from 'lucide-react';
import api, { friendlyError } from '../../utils/api';

const AdminScripts = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    features: '',
    is_active: true
  });
  const [imageFile, setImageFile] = useState(null);



  const handleOpenModal = (script = null) => {
    if (script) {
      setEditingId(script.id);
      setFormData({
        name: script.name,
        description: script.description,
        price_monthly: script.price_monthly,
        price_yearly: script.price_yearly,
        features: script.features || '',
        is_active: script.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        price_monthly: '',
        price_yearly: '',
        features: '',
        is_active: true
      });
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price_monthly', formData.price_monthly);
    data.append('price_yearly', formData.price_yearly);
    data.append('features', formData.features);
    data.append('is_active', formData.is_active ? 'true' : 'false');
    
    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      const url = editingId ? `/admin/scripts/edit/${editingId}` : '/admin/scripts/add';
      const res = await api.post(url, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        setShowModal(false);
        fetchScripts();
      } else {
        alert(friendlyError({ response: { data: res.data } }, 'We could not save this indicator. Please review the details and try again.'));
      }
    } catch (err) {
      alert(friendlyError(err, 'We could not save this indicator. Please review the details and try again.'));
    }
  };

  async function fetchScripts() {
    try {
      const res = await api.get('/admin/scripts');
      if (res.data.success) {
        setScripts(res.data.scripts || []);
      }
    } catch (err) {
      console.error("Failed to fetch scripts", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScripts();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2><FileCode className="inline-icon" /> Indicators</h2>
          <p>Manage trading indicators available on the platform.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add New Indicator
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Monthly Price</th>
                  <th>Yearly Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scripts.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>No indicators found.</td></tr>
                ) : (
                  scripts.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <img src={s.image_url || 'https://via.placeholder.com/50'} alt={s.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                          <div>
                            <strong>{s.name}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.description.substring(0, 40)}...</div>
                          </div>
                        </div>
                      </td>
                      <td>₹{s.price_monthly}</td>
                      <td>₹{s.price_yearly}</td>
                      <td>
                        <span className={`status-badge ${s.is_active ? 'approved' : 'rejected'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleOpenModal(s)} className="outline-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                          <Edit2 size={14} /> Edit
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

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>{editingId ? 'Edit Indicator' : 'Add New Indicator'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Indicator Name</label>
                <input type="text" className="auth-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="auth-input" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Monthly Price (₹)</label>
                  <input type="number" step="0.01" className="auth-input" value={formData.price_monthly} onChange={e => setFormData({...formData, price_monthly: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Yearly Price (₹)</label>
                  <input type="number" step="0.01" className="auth-input" value={formData.price_yearly} onChange={e => setFormData({...formData, price_yearly: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Features (one per line)</label>
                <textarea className="auth-input" rows="4" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})}></textarea>
              </div>
              <div className="form-group">
                <label>Image</label>
                <input type="file" className="auth-input" style={{ padding: '0.5rem' }} onChange={e => setImageFile(e.target.files[0])} accept="image/*" />
                {!imageFile && editingId && <small style={{ color: '#94a3b8' }}>Leave empty to keep current image</small>}
              </div>
              {editingId && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                  <label htmlFor="isActive" style={{ margin: 0 }}>Active (Visible on website)</label>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="outline-btn" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="primary-btn" style={{ flex: 1 }}>Save Indicator</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScripts;
