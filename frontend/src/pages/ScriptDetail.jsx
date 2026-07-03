import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Check, ArrowLeft, Loader, Shield, Zap,
  Sparkles, TrendingUp, PlayCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { friendlyError } from '../utils/api';
import '../styles/ScriptDetail.css';

const ScriptDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoRequested, setDemoRequested] = useState(false);
  const [demoToast, setDemoToast] = useState('');
  const [tvId, setTvId] = useState('');
  const [tvError, setTvError] = useState('');

  useEffect(() => {
    if (user?.tradingview_id) setTvId(user.tradingview_id);
  }, [user]);

  useEffect(() => {
    const fetchScriptData = async () => {
      try {
        const response = await api.get(`/scripts/${id}`);
        if (response.data.success) setScript(response.data.data);
        if (user && !user.is_admin) {
          const [cartRes, demoRes] = await Promise.all([
            api.get('/cart'),
            api.get('/demo-requests/mine'),
          ]);
          if (cartRes.data.success) {
            const items = cartRes.data.cart.items;
            if (items.find(item => item.script_id === parseInt(id))) setInCart(true);
          }
          if (demoRes.data.success) {
            const sid = parseInt(id);
            const found = (demoRes.data.requests || []).some(
              r => r.script_id === sid && r.status !== 'rejected'
            );
            if (found) setDemoRequested(true);
          }
        }
      } catch (error) {
        console.error('Failed to load script', error);
      } finally {
        setLoading(false);
      }
    };
    fetchScriptData();
  }, [id, user]);

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    setAddingToCart(true);
    try {
      const response = await api.post(`/cart/add/${id}`, { subscription_type: billingCycle });
      if (response.data.success) {
        window.dispatchEvent(new Event('cartUpdated'));
        setInCart(true);
      } else if (response.data.message) {
        const msg = response.data.message.toLowerCase();
        if (msg.includes('already')) setInCart(true);
        else if (msg.includes('updated to')) {
          window.dispatchEvent(new Event('cartUpdated'));
          setInCart(true);
        }
      }
    } catch (error) {
      if ((error.response?.data?.message || '').toLowerCase().includes('already')) setInCart(true);
    } finally {
      setAddingToCart(false);
    }
  };

  const showToast = (text) => {
    setDemoToast(text);
    setTimeout(() => setDemoToast(''), 4000);
  };

  const handleDemoRequest = async () => {
    if (!user) { navigate('/login'); return; }
    if (demoRequested) return;
    if (!tvId.trim()) {
      setTvError('Please enter your TradingView ID to request a demo.');
      return;
    }
    setTvError('');
    setDemoSubmitting(true);
    try {
      const res = await api.post('/demo-requests', { script_id: parseInt(id), tradingview_id: tvId.trim() });
      if (res.data.success) {
        setDemoRequested(true);
        showToast(`Demo requested for ${script.name}. Our team will reach out shortly.`);
      } else {
        showToast(friendlyError({ response: { data: res.data } }, 'Could not submit your request. Please try again.'));
      }
    } catch (err) {
      if (err.response?.data?.already_requested) {
        setDemoRequested(true);
      }
      showToast(friendlyError(err, 'Could not submit your request. Please try again.'));
    } finally {
      setDemoSubmitting(false);
    }
  };

  // Cursor parallax for the hero image
  const onImageMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform =
      `perspective(1200px) rotateX(${py * -6}deg) rotateY(${px * 8}deg) scale(1.02)`;
  };
  const onImageLeave = (e) => { e.currentTarget.style.transform = ''; };

  if (loading) {
    return (
      <div className="loader-container" style={{ minHeight: 'calc(100vh - 70px)' }}>
        <div className="loader" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="empty-state" style={{ minHeight: 'calc(100vh - 70px)' }}>
        <h2>Indicator Not Found</h2>
        <button onClick={() => navigate('/resources')} className="primary-btn" style={{ marginTop: '1.5rem' }}>
          Back to Resources
        </button>
      </div>
    );
  }

  const featuresList = script.features ? script.features.split('\n').filter(f => f.trim() !== '') : [];
  const yearlySavings = script.price_yearly
    ? (100 - (script.price_yearly / (script.price_monthly * 12) * 100)).toFixed(0)
    : 0;

  return (
    <div className="script-detail-container">
      <motion.button
        onClick={() => navigate(-1)}
        className="back-button"
        whileHover={{ x: -4 }}
      >
        <ArrowLeft size={20} /> Back
      </motion.button>

      <div className="script-detail-layout">
        {/* LEFT — image with cursor parallax */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="script-image-section"
        >
          <div
            className="script-image-tilt"
            onMouseMove={onImageMove}
            onMouseLeave={onImageLeave}
          >
            <img
              src={script.image_url || 'https://images.unsplash.com/photo-1554260570-e9689a3418b8'}
              alt={script.name}
              className="script-full-image"
            />
            <div className="image-glow" />
          </div>

          {/* Trust badges under image */}
          <div className="detail-trust-row">
            <span className="detail-trust-pill"><Shield size={14} /> Secure payment</span>
            <span className="detail-trust-pill"><Zap size={14} /> Instant access</span>
            <span className="detail-trust-pill"><TrendingUp size={14} /> Pro-grade indicator</span>
          </div>
        </motion.div>

        {/* RIGHT — info + pricing (sticky on desktop) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="script-info-section"
        >
          <div className="detail-eyebrow">
            <Sparkles size={14} /> Premium Indicator
          </div>
          <h1 className="script-title">{script.name}</h1>
          <p className="script-description">{script.description}</p>

          <div className="pricing-selector glass-card glass-card--spotlight" style={{ padding: '1.5rem' }}>
            <h3 className="section-subtitle">Choose Billing Cycle</h3>
            <div className="billing-options">
              <label className={`billing-option ${billingCycle === 'monthly' ? 'selected' : ''}`}>
                <input type="radio" name="billing" value="monthly"
                  checked={billingCycle === 'monthly'}
                  onChange={() => setBillingCycle('monthly')} />
                <div className="billing-details">
                  <span className="billing-period">Monthly</span>
                  <span className="billing-price">₹{script.price_monthly}<span>/mo</span></span>
                </div>
              </label>

              <label className={`billing-option ${billingCycle === 'yearly' ? 'selected' : ''}`}>
                <input type="radio" name="billing" value="yearly"
                  checked={billingCycle === 'yearly'}
                  onChange={() => setBillingCycle('yearly')} />
                <div className="billing-details">
                  <span className="billing-period">Yearly</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="billing-price">₹{script.price_yearly}<span>/yr</span></span>
                    {yearlySavings > 0 && <span className="save-badge">Save {yearlySavings}%</span>}
                  </div>
                </div>
              </label>
            </div>

            <button
              className="add-to-cart-large btn-shine"
              onClick={handleAddToCart}
              disabled={addingToCart || inCart}
              style={{ marginTop: '1.5rem' }}
            >
              {inCart ? (
                <><Check size={22} /> In Cart</>
              ) : addingToCart ? (
                <><Loader className="spin" size={22} /> Adding...</>
              ) : (
                <><ShoppingCart size={22} /> Add to Cart</>
              )}
            </button>

            {user && !user.is_admin && !demoRequested && (
              <div style={{ marginTop: '0.75rem' }}>
                <label
                  htmlFor="demo-tv-id"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}
                >
                  TradingView ID <span style={{ color: '#f9a8d4' }}>*</span>
                </label>
                <input
                  id="demo-tv-id"
                  type="text"
                  value={tvId}
                  onChange={(e) => { setTvId(e.target.value); if (e.target.value.trim()) setTvError(''); }}
                  placeholder="e.g. your_tradingview_username"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${tvError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.15)'}`,
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}
                />
                {tvError && (
                  <div style={{ marginTop: '0.35rem', color: '#fca5a5', fontSize: '0.8rem' }}>{tvError}</div>
                )}
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    lineHeight: '1.5',
                    color: '#fde68a',
                  }}
                >
                  ⚠️ The demo/trial is granted <strong>only to this TradingView ID</strong> and
                  <strong> cannot be changed later</strong>. Please enter it carefully.
                </div>
              </div>
            )}

            <button
              type="button"
              className="outline-btn"
              onClick={handleDemoRequest}
              disabled={demoSubmitting || demoRequested || (!!user && !user.is_admin && !tvId.trim())}
              style={{
                marginTop: '0.75rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderColor: 'rgba(236, 72, 153, 0.4)',
                color: '#f9a8d4',
              }}
            >
              {demoSubmitting ? (
                <><Loader className="spin" size={20} /> Sending...</>
              ) : demoRequested ? (
                <><CheckCircle2 size={20} /> Demo Requested</>
              ) : (
                <><PlayCircle size={20} /> Try a free Demo first</>
              )}
            </button>
          </div>

          {featuresList.length > 0 && (
            <div className="features-list-section">
              <h3 className="section-subtitle">
                Premium <span className="gradient-text">Features</span>
              </h3>
              <ul className="detailed-features-list">
                {featuresList.map((feature, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.4, delay: idx * 0.06 }}
                  >
                    <span className="feature-check-wrap">
                      <Check size={16} className="feature-check" />
                    </span>
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {demoToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: 'var(--text-primary)',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              zIndex: 1500,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <CheckCircle2 size={18} color="#22c55e" />
            {demoToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScriptDetail;
