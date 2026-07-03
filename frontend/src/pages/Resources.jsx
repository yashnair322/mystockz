import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, PlayCircle, Loader, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { friendlyError } from '../utils/api';
import '../styles/Home.css';

const useCard3DTilt = () => {
  const onMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const tiltX = (0.5 - py) * 10;
    const tiltY = (px - 0.5) * 12;
    card.style.transform =
      `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px)`;
    card.style.setProperty('--mouse-x', `${px * 100}%`);
    card.style.setProperty('--mouse-y', `${py * 100}%`);
  };
  const onLeave = (e) => { e.currentTarget.style.transform = ''; };
  return { onMouseMove: onMove, onMouseLeave: onLeave };
};

const Resources = () => {
  const tilt = useCard3DTilt();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(null);
  const [cartItemIds, setCartItemIds] = useState(new Set());
  const [demoSubmitting, setDemoSubmitting] = useState(null);
  const [demoRequested, setDemoRequested] = useState(new Set());
  const [demoToast, setDemoToast] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchScriptsAndCart = async () => {
      try {
        const response = await api.get('/scripts');
        if (response.data.success) {
          setScripts(response.data.data);
        }
        if (user && !user.is_admin) {
          const [cartRes, demoRes] = await Promise.all([
            api.get('/cart'),
            api.get('/demo-requests/mine'),
          ]);
          if (cartRes.data.success) {
            setCartItemIds(new Set(cartRes.data.cart.items.map(item => item.script_id)));
          }
          if (demoRes.data.success) {
            const active = (demoRes.data.requests || []).filter(r => r.status !== 'rejected');
            const ids = active.map(r => (r.script_id == null ? 'platform' : r.script_id));
            setDemoRequested(new Set(ids));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchScriptsAndCart();
  }, [user]);

  const handleAddToCart = async (scriptId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setAddingToCart(scriptId);
    try {
      const response = await api.post(`/cart/add/${scriptId}`, { subscription_type: 'monthly' });
      if (response.data.success) {
        window.dispatchEvent(new Event('cartUpdated'));
        setCartItemIds(prev => new Set([...prev, scriptId]));
      } else {
        if (response.data.message && response.data.message.toLowerCase().includes('already')) {
          setCartItemIds(prev => new Set([...prev, scriptId]));
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message || "";
      if (msg.toLowerCase().includes('already')) {
        setCartItemIds(prev => new Set([...prev, scriptId]));
      }
    } finally {
      setAddingToCart(null);
    }
  };

  const showToast = (text) => {
    setDemoToast(text);
    setTimeout(() => setDemoToast(''), 4000);
  };

  const requestDemo = async (script = null) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const key = script?.id ?? 'platform';
    if (demoRequested.has(key)) return;
    setDemoSubmitting(key);
    try {
      const payload = script?.id ? { script_id: script.id } : {};
      const res = await api.post('/demo-requests', payload);
      if (res.data.success) {
        setDemoRequested(prev => new Set([...prev, key]));
        showToast(script ? `Demo requested for ${script.name}. Our team will reach out shortly.` : 'Demo request received. Our team will reach out shortly.');
      } else {
        showToast(friendlyError({ response: { data: res.data } }, 'Could not submit your request. Please try again.'));
      }
    } catch (err) {
      if (err.response?.data?.already_requested) {
        setDemoRequested(prev => new Set([...prev, key]));
      }
      showToast(friendlyError(err, 'Could not submit your request. Please try again.'));
    } finally {
      setDemoSubmitting(null);
    }
  };

  return (
    <div className="home-container" style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <section className="featured-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="section-eyebrow">Browse the catalog</span>
          <h2>All Premium <span className="gradient-text">Resources</span></h2>
          <p className="section-subtitle">
            Every script and indicator we offer — try a free demo first, then pick what fits your strategy.
          </p>
          <div className="header-line"></div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            maxWidth: '780px',
            margin: '0 auto 2.5rem',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.10))',
            border: '1px solid rgba(139,92,246,0.28)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ flex: '1 1 320px' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>
              Not sure yet? Try a free demo.
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Evaluate the platform & indicators before subscribing.
            </p>
          </div>
          <button
            type="button"
            className="btn-shine"
            onClick={() => requestDemo(null)}
            disabled={demoSubmitting === 'platform' || demoRequested.has('platform')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {demoSubmitting === 'platform' ? (
              <><Loader className="spin" size={18} /> Sending...</>
            ) : demoRequested.has('platform') ? (
              <><CheckCircle2 size={18} /> Demo Requested</>
            ) : (
              <><PlayCircle size={18} /> Request a Demo</>
            )}
          </button>
        </motion.div>

        {loading ? (
          <div className="loader-container">
            <div className="loader"></div>
          </div>
        ) : scripts.length > 0 ? (
          <div className="scripts-grid">
            {scripts.map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="script-card"
                onClick={() => navigate(`/scripts/${script.id}`)}
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                <div className="script-image-wrapper">
                  <img src={script.image_url || 'https://images.unsplash.com/photo-1554260570-e9689a3418b8'} alt={script.name} className="script-image" />
                  <div className="script-price-badge">
                    ₹{script.price_monthly}<span>/mo</span>
                  </div>
                </div>
                <div className="script-content">
                  <h3>{script.name}</h3>
                  <p>{script.description ? script.description.substring(0, 120) : ''}...</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button
                      className="outline-btn"
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(script.id); }}
                      disabled={addingToCart === script.id || cartItemIds.has(script.id)}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%' }}
                    >
                      <ShoppingCart size={18} />
                      {cartItemIds.has(script.id) ? 'In Cart' : addingToCart === script.id ? 'Adding...' : 'Add to Cart'}
                    </button>
                    <button
                      className="outline-btn"
                      onClick={(e) => { e.stopPropagation(); requestDemo(script); }}
                      disabled={demoSubmitting === script.id || demoRequested.has(script.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        borderColor: 'rgba(236, 72, 153, 0.4)',
                        color: '#f9a8d4',
                      }}
                    >
                      {demoSubmitting === script.id ? (
                        <><Loader className="spin" size={18} /> Sending...</>
                      ) : demoRequested.has(script.id) ? (
                        <><CheckCircle2 size={18} /> Demo Requested</>
                      ) : (
                        <><PlayCircle size={18} /> Request Demo</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No resources available at the moment. Please check back later.</p>
          </div>
        )}
      </section>

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

export default Resources;
