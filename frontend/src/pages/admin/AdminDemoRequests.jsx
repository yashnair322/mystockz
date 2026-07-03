import { useEffect, useState } from 'react';
import { PlayCircle, Search, Mail, Phone, MessageSquare, Trash2, Save, X } from 'lucide-react';
import api, { friendlyError } from '../../utils/api';

const STATUS_OPTIONS = ['pending', 'scheduled', 'completed', 'rejected'];

const AdminDemoRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingId, setSavingId] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/demo-requests');
      if (res.data.success) {
        setRequests(res.data.demo_requests || []);
      }
    } catch (err) {
      console.error('Failed to load demo requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id, status) => {
    setSavingId(id);
    try {
      const res = await api.post(`/admin/demo-requests/${id}`, { status });
      if (res.data.success) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      } else {
        alert(friendlyError({ response: { data: res.data } }, 'We could not update the status. Please try again.'));
      }
    } catch (err) {
      alert(friendlyError(err, 'We could not update the status. Please try again.'));
    } finally {
      setSavingId(null);
    }
  };

  const saveNotes = async (id) => {
    setSavingId(id);
    try {
      const res = await api.post(`/admin/demo-requests/${id}`, { admin_notes: noteDraft });
      if (res.data.success) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, admin_notes: noteDraft } : r)));
        setEditing(null);
      } else {
        alert(friendlyError({ response: { data: res.data } }, 'We could not save the notes. Please try again.'));
      }
    } catch (err) {
      alert(friendlyError(err, 'We could not save the notes. Please try again.'));
    } finally {
      setSavingId(null);
    }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm('Delete this demo request? This cannot be undone.')) return;
    try {
      const res = await api.post(`/admin/demo-requests/${id}/delete`);
      if (res.data.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(friendlyError({ response: { data: res.data } }, 'We could not delete this request. Please try again.'));
      }
    } catch (err) {
      alert(friendlyError(err, 'We could not delete this request. Please try again.'));
    }
  };

  const filtered = requests.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.name || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      (r.script_name || '').toLowerCase().includes(s) ||
      (r.tradingview_id || '').toLowerCase().includes(s)
    );
  });

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = requests.filter((r) => r.status === s).length;
    return acc;
  }, {});

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2><PlayCircle className="inline-icon" /> Demo / Trial Requests</h2>
          <p>Track and manage demo requests submitted by users before purchase.</p>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <FilterChip label={`All (${requests.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
          {STATUS_OPTIONS.map((s) => (
            <FilterChip
              key={s}
              label={`${capitalize(s)} (${counts[s] || 0})`}
              active={filter === s}
              onClick={() => setFilter(s)}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Search size={18} style={{ marginRight: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by name, email, indicator or TradingView ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No demo requests found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Requester</th>
                  <th>Indicator</th>
                  <th>TradingView ID</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Mail size={12} /> {r.email}
                      </div>
                      {r.phone && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Phone size={12} /> {r.phone}
                        </div>
                      )}
                    </td>
                    <td>{r.script_name || <em style={{ color: '#94a3b8' }}>Platform-wide</em>}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                      {r.tradingview_id || '—'}
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      {r.message ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.3rem',
                            fontSize: '0.85rem',
                            color: '#cbd5e1',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                          title={r.message}
                        >
                          <MessageSquare size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{truncate(r.message, 120)}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        disabled={savingId === r.id}
                        className={`status-select status-${r.status}`}
                        style={{
                          background: 'rgba(15,23,42,0.6)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.15)',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          textTransform: 'capitalize',
                          cursor: 'pointer',
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ minWidth: '220px' }}>
                      {editing === r.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            rows={3}
                            maxLength={5000}
                            style={{
                              background: 'rgba(15,23,42,0.6)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: 'white',
                              borderRadius: '6px',
                              padding: '0.4rem 0.5rem',
                              fontSize: '0.82rem',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => saveNotes(r.id)}
                              disabled={savingId === r.id}
                              className="btn-success"
                              style={btnMini('#10b981')}
                            >
                              <Save size={14} /> Save
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="btn-danger"
                              style={btnMini('#64748b')}
                            >
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setEditing(r.id); setNoteDraft(r.admin_notes || ''); }}
                          style={{
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            color: r.admin_notes ? '#e2e8f0' : '#94a3b8',
                            fontStyle: r.admin_notes ? 'normal' : 'italic',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                          title="Click to edit"
                        >
                          {r.admin_notes ? truncate(r.admin_notes, 120) : 'Add notes...'}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {new Date(r.created_at).toLocaleDateString()}<br />
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button
                        onClick={() => deleteRequest(r.id)}
                        className="btn-danger"
                        style={btnMini('#ef4444')}
                        title="Delete request"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const FilterChip = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '0.4rem 0.85rem',
      borderRadius: '999px',
      border: `1px solid ${active ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.12)'}`,
      background: active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
      color: active ? '#e9d5ff' : '#cbd5e1',
      fontSize: '0.82rem',
      cursor: 'pointer',
      fontWeight: active ? 600 : 500,
    }}
  >
    {label}
  </button>
);

const btnMini = (bg) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.4rem 0.7rem',
  borderRadius: '6px',
  border: 'none',
  color: 'white',
  background: bg,
  fontSize: '0.78rem',
  cursor: 'pointer',
});

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default AdminDemoRequests;
