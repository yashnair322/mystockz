import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Check, ArrowLeft, Loader, Shield, Zap,
  Sparkles, TrendingUp, PlayCircle, CheckCircle2,
  MessageSquare, Trash2, Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { friendlyError } from '../utils/api';
import usePageMeta from '../utils/usePageMeta';
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
  const [comments, setComments] = useState([]);
  const [canComment, setCanComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    if (user?.tradingview_id) setTvId(user.tradingview_id);
  }, [user]);

  // Per-script SEO: unique title + description once the script has loaded.
  usePageMeta(
    script ? script.name : 'Trading Indicator',
    script
      ? (script.description || `${script.name} — a premium TradingView indicator on Mystockz.`).slice(0, 160)
      : 'Explore this premium TradingView indicator on Mystockz — features, pricing, and a free demo option.',
  );

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

  const fetchComments = async () => {
    try {
      const res = await api.get(`/scripts/${id}/comments`);
      if (res.data.success) {
        setComments(res.data.comments || []);
        setCanComment(!!res.data.can_comment);
      }
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handlePostComment = async () => {
    const text = commentText.trim();
    if (!text) { setCommentError('Please write something first.'); return; }
    setCommentError('');
    setCommentSubmitting(true);
    try {
      const res = await api.post(`/scripts/${id}/comments`, { content: text });
      if (res.data.success) {
        setCommentText('');
        if (res.data.comment) setComments((prev) => [res.data.comment, ...prev]);
        else fetchComments();
      } else {
        setCommentError(friendlyError({ response: { data: res.data } }, 'Could not post your comment.'));
      }
    } catch (err) {
      setCommentError(friendlyError(err, 'Could not post your comment.'));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await api.delete(`/comments/${commentId}`);
      if (res.data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

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

      {/* ============= COMMENTS / REVIEWS ============= */}
      <div className="comments-section" style={{ maxWidth: '900px', margin: '3rem auto 0', padding: '0 1rem' }}>
        <h3 className="section-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={22} /> What buyers are <span className="gradient-text">saying</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({comments.length})</span>
        </h3>

        {canComment ? (
          <div className="glass-card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <textarea
              value={commentText}
              onChange={(e) => { setCommentText(e.target.value); if (e.target.value.trim()) setCommentError(''); }}
              placeholder="Share your experience with this indicator…"
              rows={3}
              maxLength={2000}
              style={{
                width: '100%', resize: 'vertical', padding: '0.75rem 0.9rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${commentError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.15)'}`,
                color: 'var(--text-primary)', fontSize: '0.92rem', fontFamily: 'inherit',
              }}
            />
            {commentError && (
              <div style={{ marginTop: '0.4rem', color: '#fca5a5', fontSize: '0.82rem' }}>{commentError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                className="btn-shine"
                onClick={handlePostComment}
                disabled={commentSubmitting || !commentText.trim()}
                style={{ opacity: (commentSubmitting || !commentText.trim()) ? 0.6 : 1 }}
              >
                {commentSubmitting ? <Loader className="spin" size={18} /> : <Send size={18} />}
                {commentSubmitting ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '1rem 1.25rem', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {user
              ? '🔒 Only buyers of this indicator can post a comment — purchase it to share your experience.'
              : '🔒 Purchase this indicator to leave a comment. You can read what buyers say below.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          {comments.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
              No comments yet — be the first to share your experience after purchasing.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{c.author}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    </span>
                    {c.is_mine && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        title="Delete your comment"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', padding: 0 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {c.content}
                </p>
              </div>
            ))
          )}
        </div>
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
