import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import api, { friendlyError } from '../../utils/api';

const AdminApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);



  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
    
    try {
      const res = await api.post(`/admin/approvals/${id}`, { action });
      if (res.data.success) {
        alert(`Request ${action}d successfully`);
        fetchApprovals();
      } else {
        alert(friendlyError({ response: { data: res.data } }, `We could not ${action} this request. Please try again.`));
      }
    } catch (err) {
      alert(friendlyError(err, `We could not ${action} this request. Please try again.`));
    }
  };


  async function fetchApprovals() {
    try {
      const res = await api.get('/admin/approvals');
      if (res.data.success) {
        setApprovals(res.data.approvals);
      }
    } catch (err) {
      console.error("Failed to fetch approvals", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApprovals();
  }, []);

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>TradingView Approvals</h1>
        <p>Manage access to your TradingView indicators.</p>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User Email</th>
              <th>Indicator</th>
              <th>TradingView ID</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map(approval => (
              <tr key={approval.id}>
                <td>#{approval.id}</td>
                <td>{approval.user_email}</td>
                <td>{approval.script_name}</td>
                <td style={{fontFamily: 'monospace', color: 'var(--accent-primary)'}}>{approval.tradingview_id || 'Not Provided'}</td>
                <td>
                  <span className={`status-badge ${approval.status}`}>{approval.status}</span>
                </td>
                <td>{new Date(approval.created_at).toLocaleDateString()}</td>
                <td>
                  {approval.status === 'pending' ? (
                    <div className="flex-gap">
                      <button onClick={() => handleAction(approval.id, 'approve')} className="action-btn approve" title="Approve Access">
                        <CheckCircle size={18} />
                      </button>
                      <button onClick={() => handleAction(approval.id, 'reject')} className="action-btn reject" title="Reject Request">
                        <XCircle size={18} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {approvals.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center">No approval requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminApprovals;
