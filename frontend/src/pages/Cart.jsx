import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, CreditCard, ShoppingBag, Loader, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { friendlyError } from '../utils/api';
import '../styles/Cart.css';

const Cart = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [tvId, setTvId] = useState('');
  const [tvError, setTvError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  // Prefill the TradingView ID from the user's profile when available.
  useEffect(() => {
    if (user?.tradingview_id) setTvId(user.tradingview_id);
  }, [user]);

  const fetchCart = async () => {
    try {
      const res = await api.get('/cart');
      if (res.data.success) {
        setCart(res.data.cart);
      }
    } catch (err) {
      console.error("Failed to fetch cart", err);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/cart/remove/${itemId}`);
      window.dispatchEvent(new Event('cartUpdated'));
      fetchCart();
    } catch (err) {
      console.error("Failed to remove item", err);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleCheckout = async () => {
    if (!tvId.trim()) {
      setTvError('Please enter your TradingView ID before payment.');
      return;
    }
    if (!policyAccepted) {
      setPolicyError('Please confirm the no-refund policy before continuing.');
      return;
    }
    setTvError('');
    setPolicyError('');
    setIsProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Unable to load the payment gateway. Please check your connection and try again.');

      // 1. Create order on backend (TradingView ID is required and access is bound to it)
      const res = await api.post('/checkout/create-order', { tradingview_id: tvId.trim() });
      if (!res.data.success) throw new Error(friendlyError({ response: { data: res.data } }, 'We could not start checkout. Please try again.'));

      const orderData = res.data;

      // 2. Initialize Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Mystockz',
        description: 'Script Subscription',
        order_id: orderData.order_id,
        handler: async function (response) {
          // 3. Verify payment on backend
          try {
            const verifyRes = await api.post('/checkout/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            
            if (verifyRes.data.success) {
              navigate('/dashboard');
            } else {
              alert(friendlyError({ response: { data: verifyRes.data } }, 'We could not confirm your payment. If you were charged, please contact support.'));
            }
          } catch (err) {
            console.error("Verification error", err);
            alert(friendlyError(err, 'We could not confirm your payment. If you were charged, please contact support.'));
          }
        },
        prefill: {
          name: orderData.user.name || '',
          email: orderData.user.email || '',
          contact: '',
        },
        notes: {},
        modal: {
          confirm_close: true,
          escape: false,
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        alert('Your payment could not be completed. Please try again or use a different payment method.');
      });
      rzp.open();

    } catch (err) {
      console.error("Checkout failed", err);
      alert(friendlyError(err, 'Checkout could not be completed. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };


  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  return (
    <div className="home-container" style={{ padding: '4rem 2rem' }}>
      <div className="cart-wrapper">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="section-header"
        >
          <span className="section-eyebrow">Your selection</span>
          <h2>Shopping <span className="gradient-text">Cart</span></h2>
          <p className="section-subtitle">Review your items, then checkout securely with Razorpay.</p>
          <div className="header-line"></div>
        </motion.div>

        {cart.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="empty-state"
            style={{ padding: '4rem 2rem' }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-block', marginBottom: '1.5rem' }}
            >
              <ShoppingBag size={64} style={{ color: '#a78bfa' }} />
            </motion.div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Your cart is empty</h3>
            <p style={{ marginBottom: '1.5rem' }}>Looks like you haven't added any premium scripts yet.</p>
            <button onClick={() => navigate('/resources')} className="btn-shine">
              <ArrowRight size={18} /> Browse Resources
            </button>
          </motion.div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div 
                    key={item.item_id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="cart-item"
                  >
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1554260570-e9689a3418b8'} alt={item.name} className="cart-item-image" />
                    <div className="cart-item-details">
                      <h3>{item.name}</h3>
                      <p className="subscription-type">
                        {item.subscription_type === 'yearly' ? 'Annual Subscription' : 'Monthly Subscription'}
                      </p>
                      <div className="cart-item-price">₹{item.price}</div>
                    </div>
                    <button 
                      className="remove-btn" 
                      onClick={() => removeItem(item.item_id)}
                      title="Remove from cart"
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="cart-summary">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal ({cart.items.length} items)</span>
                <span>₹{cart.total}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{cart.total}</span>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <label
                  htmlFor="tv-id"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}
                >
                  TradingView ID <span style={{ color: '#f9a8d4' }}>*</span>
                </label>
                <input
                  id="tv-id"
                  type="text"
                  value={tvId}
                  onChange={(e) => { setTvId(e.target.value); if (e.target.value.trim()) setTvError(''); }}
                  placeholder="e.g. your_tradingview_username"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${tvError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.15)'}`,
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
                {tvError && (
                  <div style={{ marginTop: '0.4rem', color: '#fca5a5', fontSize: '0.82rem' }}>{tvError}</div>
                )}
                <div
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.7rem 0.85rem',
                    background: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    lineHeight: '1.5',
                    color: '#fde68a',
                  }}
                >
                  ⚠️ Access will be granted <strong>only to this TradingView ID</strong>. Please double-check it —
                  <strong> it cannot be changed or corrected after payment.</strong>
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  marginTop: '1.5rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(236, 72, 153, 0.06)',
                  border: `1px solid ${policyError ? 'rgba(239,68,68,0.5)' : 'rgba(236, 72, 153, 0.25)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(e) => {
                    setPolicyAccepted(e.target.checked);
                    if (e.target.checked) setPolicyError('');
                  }}
                  style={{ marginTop: '0.25rem', accentColor: '#ec4899', flexShrink: 0 }}
                />
                <span>
                  I have understood the features through the demo/trial and agree to the{' '}
                  <a
                    href="/refund"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#f9a8d4', textDecoration: 'underline' }}
                  >
                    no-refund policy
                  </a>
                  .
                </span>
              </label>

              {policyError && (
                <div
                  style={{
                    marginTop: '0.6rem',
                    color: '#fca5a5',
                    fontSize: '0.82rem',
                  }}
                >
                  {policyError}
                </div>
              )}

              <button
                className="btn-shine w-full"
                onClick={handleCheckout}
                disabled={isProcessing || !policyAccepted || !tvId.trim()}
                style={{
                  marginTop: '1rem',
                  opacity: (!policyAccepted || !tvId.trim()) ? 0.6 : 1,
                  cursor: (!policyAccepted || !tvId.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? <Loader className="spin" size={20} /> : <CreditCard size={20} />}
                {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
