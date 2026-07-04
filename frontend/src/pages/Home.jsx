import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Activity, BarChart2, ArrowRight, ShoppingCart,
  Sparkles, Zap, LineChart, ChevronUp, ChevronDown,
  PlayCircle, Loader, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { friendlyError } from '../utils/api';
import TradingHeroBackground from '../components/TradingHeroBackground';
import '../styles/Home.css';

/* Magnetic button — pulls toward cursor */
const MagneticButton = ({ children, className = '', strength = 0.35, ...props }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)';
  };
  return (
    <button
      ref={ref}
      className={`magnetic-btn ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...props}
    >
      {children}
    </button>
  );
};

/* 3D tilt + spotlight handler for cards */
const useCard3DTilt = () => {
  const onMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const tiltX = (0.5 - py) * 10;   // rotate around X (vertical pos)
    const tiltY = (px - 0.5) * 12;   // rotate around Y (horizontal pos)
    card.style.transform =
      `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px)`;
    card.style.setProperty('--mouse-x', `${px * 100}%`);
    card.style.setProperty('--mouse-y', `${py * 100}%`);
  };
  const onLeave = (e) => {
    e.currentTarget.style.transform = '';
  };
  return { onMouseMove: onMove, onMouseLeave: onLeave };
};

/* Floating-price label positions / animation delays — values come from the API */
const FLOATING_POSITIONS = [
  { x: '12%', delay: 0  },
  { x: '85%', delay: 3  },
  { x: '70%', delay: 6  },
  { x: '22%', delay: 9  },
  { x: '38%', delay: 11 },
  { x: '55%', delay: 5  },
];

// End-of-day prices change at most once per trading day (after the 15:30 IST
// close), so a slow refresh is plenty — it just lets long-open tabs pick up the
// post-close update without a reload.
const QUOTE_POLL_MS = 30 * 60_000;   // re-check /api/market/quotes every 30 min

const Home = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(null);
  const [cartItemIds, setCartItemIds] = useState(new Set());
  const [tickerItems, setTickerItems] = useState([]);
  const [floatingPrices, setFloatingPrices] = useState([]);
  const [demoSubmitting, setDemoSubmitting] = useState(null);
  const [demoRequested, setDemoRequested] = useState(new Set());
  const [demoToast, setDemoToast] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const tilt = useCard3DTilt();
  const parallaxRef = useRef(null);
  const heroRef = useRef(null);

  /* Fetch end-of-day market quotes — once on mount, then a slow re-check */
  useEffect(() => {
    let cancelled = false;
    const fetchQuotes = async () => {
      try {
        const res = await api.get('/market/quotes');
        if (!cancelled && res.data?.success && res.data.data) {
          setTickerItems(res.data.data.ticker || []);
          setFloatingPrices(res.data.data.floating || []);
        }
      } catch (err) {
        console.warn('Live quotes unavailable', err);
      }
    };
    fetchQuotes();
    const id = setInterval(fetchQuotes, QUOTE_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Mouse parallax for the hero chart layer.
  // The rAF loop only spins while the value is actually changing — once the
  // chart has eased into its target position we stop scheduling frames, so the
  // hero contributes nothing to per-frame CPU/GPU cost during normal scroll.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    // Respect reduced-motion users — skip the parallax entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let running = false;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let heroVisible = true;

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      currentX = lerp(currentX, targetX, 0.08);
      currentY = lerp(currentY, targetY, 0.08);
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }
      // Settle threshold — once we're close enough to the target, stop the loop.
      if (Math.abs(currentX - targetX) < 0.05 && Math.abs(currentY - targetY) < 0.05) {
        currentX = targetX;
        currentY = targetY;
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (running || !heroVisible) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const rect = hero.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = nx * 25;
      targetY = ny * 25;
      startLoop();
    };

    const onLeave = () => {
      targetX = 0; targetY = 0;
      startLoop();
    };

    // Only run when the hero is on-screen — saves work while scrolling further down.
    const io = new IntersectionObserver((entries) => {
      heroVisible = entries[0]?.isIntersecting ?? true;
      if (heroVisible) startLoop();
      else if (raf) cancelAnimationFrame(raf);
    }, { threshold: 0 });
    io.observe(hero);

    hero.addEventListener('mousemove', onMove, { passive: true });
    hero.addEventListener('mouseleave', onLeave, { passive: true });

    return () => {
      io.disconnect();
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const fetchScriptsAndCart = async () => {
      try {
        const response = await api.get('/scripts');
        if (response.data.success) setScripts(response.data.data);
        if (user && !user.is_admin) {
          const [cartRes, demoRes] = await Promise.all([
            api.get('/cart'),
            api.get('/demo-requests/mine'),
          ]);
          if (cartRes.data.success) {
            setCartItemIds(new Set(cartRes.data.cart.items.map(i => i.script_id)));
          }
          if (demoRes.data.success) {
            const active = (demoRes.data.requests || []).filter(r => r.status !== 'rejected');
            const ids = active.map(r => (r.script_id == null ? 'platform' : r.script_id));
            setDemoRequested(new Set(ids));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchScriptsAndCart();
  }, [user]);

  const showDemoToast = (text) => {
    setDemoToast(text);
    setTimeout(() => setDemoToast(''), 4000);
  };

  const requestDemo = async (script = null) => {
    if (!user) { navigate('/login'); return; }
    const key = script?.id ?? 'platform';
    if (demoRequested.has(key)) return;
    setDemoSubmitting(key);
    try {
      const payload = script?.id ? { script_id: script.id } : {};
      const res = await api.post('/demo-requests', payload);
      if (res.data.success) {
        setDemoRequested(prev => new Set([...prev, key]));
        showDemoToast(script
          ? `Demo requested for ${script.name}. Our team will reach out shortly.`
          : 'Demo request received. Our team will reach out shortly.');
      } else {
        showDemoToast(friendlyError({ response: { data: res.data } }, 'Could not submit your request. Please try again.'));
      }
    } catch (err) {
      if (err.response?.data?.already_requested) {
        setDemoRequested(prev => new Set([...prev, key]));
      }
      showDemoToast(friendlyError(err, 'Could not submit your request. Please try again.'));
    } finally {
      setDemoSubmitting(null);
    }
  };

  const handleAddToCart = async (scriptId) => {
    if (!user) { navigate('/login'); return; }
    setAddingToCart(scriptId);
    try {
      const response = await api.post(`/cart/add/${scriptId}`, { subscription_type: 'monthly' });
      if (response.data.success) {
        window.dispatchEvent(new Event('cartUpdated'));
        setCartItemIds(prev => new Set([...prev, scriptId]));
      } else if (response.data.message?.toLowerCase().includes('already')) {
        setCartItemIds(prev => new Set([...prev, scriptId]));
      }
    } catch (error) {
      if ((error.response?.data?.message || '').toLowerCase().includes('already')) {
        setCartItemIds(prev => new Set([...prev, scriptId]));
      }
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="home-container">
      {/* ============= HERO ============= */}
      <section className="hero-section" ref={heroRef}>
        {/* Parallax layer — chart + decoration shifts subtly with cursor */}
        <div className="hero-parallax" ref={parallaxRef}>
          <TradingHeroBackground />
          <div className="bg-shape shape-1" />
          <div className="bg-shape shape-2" />
          <div className="bg-shape shape-3" />
          <span className="particle p1" />
          <span className="particle p2" />
          <span className="particle p3" />
          <span className="particle p4" />
          <span className="particle p5" />

          {/* Floating end-of-day price badges (Indian stocks, refreshed daily) */}
          {floatingPrices.map((fp, i) => {
            const pos = FLOATING_POSITIONS[i % FLOATING_POSITIONS.length];
            const isIndex = fp.symbol?.startsWith('^');
            return (
              <span
                key={fp.symbol}
                className={`floating-price ${fp.up ? 'up' : 'down'}`}
                style={{ left: pos.x, bottom: '-60px', animationDelay: `${pos.delay}s` }}
              >
                <span className="fp-symbol">{fp.label}</span>
                <span>{isIndex ? '' : '₹'}{fp.value}</span>
                {fp.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{fp.change}</span>
              </span>
            );
          })}
        </div>

        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="hero-badge"
          >
            <span className="badge-dot" />
            <Sparkles size={14} />
            Visual Market Intelligence for Smart Trading
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="hero-title"
          >
            Visual Market Intelligence<br />
            for <span className="gradient-text">Smart Trading</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="hero-subtitle"
          >
            Dashboards, indicators, and screeners that turn market noise
            into clear, visual signals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="hero-actions"
          >
            <MagneticButton className="primary-btn" onClick={() => navigate('/resources')}>
              Explore Resources <ArrowRight size={20} className="btn-icon" />
            </MagneticButton>
            <MagneticButton className="ghost-btn" strength={0.25}
              onClick={() => navigate(user ? '/dashboard' : '/register')}>
              <Zap size={18} /> {user ? 'Go to Dashboard' : 'Get Started Free'}
            </MagneticButton>
          </motion.div>

        </div>
      </section>

      {/* ============= END-OF-DAY MARKET TICKER (Indian stocks, refreshed daily) ============= */}
      {tickerItems.length > 0 && (
        <section className="ticker-section" aria-hidden="true">
          <div className="ticker-track">
            {[...tickerItems, ...tickerItems].map((it, i) => {
              const isIndex = it.symbol?.startsWith('^');
              return (
                <div key={`${it.symbol}-${i}`} className="ticker-item">
                  <LineChart size={16} className="ticker-icon" />
                  <span>{it.label}</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {isIndex ? '' : '₹'}{it.value}
                  </span>
                  <span className={it.up ? 'ticker-up' : 'ticker-down'}>
                    {it.up ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {it.change}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============= FEATURED RESOURCES ============= */}
      <section className="featured-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="section-eyebrow">Handpicked for you</span>
          <h2>Featured <span className="gradient-text">Resources</span></h2>
          <p className="section-subtitle">
            Curated, battle-tested indicators and scripts that traders rely on every day.
          </p>
          <div className="header-line" />
        </motion.div>

        {loading ? (
          <div className="loader-container"><div className="loader" /></div>
        ) : scripts.length > 0 ? (
          <div className="scripts-grid">
            {scripts.slice(0, 3).map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.55, delay: index * 0.12 }}
                className="script-card"
                onClick={() => navigate(`/scripts/${script.id}`)}
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                <div className="script-image-wrapper">
                  <img
                    src={script.image_url || 'https://images.unsplash.com/photo-1554260570-e9689a3418b8'}
                    alt={script.name}
                    className="script-image"
                  />
                  <div className="script-price-badge">
                    ₹{script.price_monthly}<span>/mo</span>
                  </div>
                </div>
                <div className="script-content">
                  <h3>{script.name}</h3>
                  <p>{script.description.substring(0, 120)}...</p>
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

      {/* ============= FEATURES ============= */}
      <section className="features-section">
        <motion.div
          className="section-header text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="section-eyebrow">Why traders choose us</span>
          <h2>Built for <span className="gradient-text">Serious Traders</span></h2>
          <p className="section-subtitle">
            Everything you need to make confident, data-driven decisions in volatile markets.
          </p>
          <div className="header-line center" />
        </motion.div>

        <div className="features-grid">
          {[
            { icon: TrendingUp, title: 'Professional Tools',     desc: 'Advanced technical analysis tools designed for comprehensive market research and strategy development.' },
            { icon: Activity,   title: 'Real-time Insights',     desc: 'Dynamic indicators that help you spot trends and patterns as they emerge in the market.' },
            { icon: BarChart2,  title: 'Data-Driven Decisions',  desc: 'Quantitative data to remove emotion from your analysis and make objective, calculated moves.' },
          ].map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="feature-icon-wrapper">
                <Icon size={34} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============= CTA ============= */}
      <section className="cta-section">
        <motion.div
          className="cta-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <h2>Ready to level up your <span className="gradient-text">trading game?</span></h2>
          <p>
            Join thousands of traders who use our premium scripts to gain
            a decisive edge in every session.
          </p>
          <div className="hero-actions">
            <MagneticButton className="primary-btn" onClick={() => navigate('/resources')}>
              Browse All Resources <ArrowRight size={20} className="btn-icon" />
            </MagneticButton>
            {!user && (
              <MagneticButton className="ghost-btn" strength={0.25} onClick={() => navigate('/register')}>
                Create Free Account
              </MagneticButton>
            )}
          </div>
        </motion.div>
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

export default Home;
