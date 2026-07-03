import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut, LayoutDashboard, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = async () => {
    if (user && !user.is_admin) {
      try {
        const response = await api.get('/cart');
        if (response.data.success) {
          setCartCount(response.data.cart.items.length);
        }
      } catch (error) {
        console.error("Failed to fetch cart", error);
      }
    }
  };

  useEffect(() => {
    fetchCartCount();
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setDropdownOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const toggleMenu = () => setIsOpen(!isOpen);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setDropdownOpen(false);
  }, [location]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <ActivityIcon />
          <span>Mystockz</span>
        </Link>

        {/* Desktop Menu */}
        <div className="desktop-menu">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/resources" className={`nav-link ${location.pathname === '/resources' ? 'active' : ''}`}>Resources</Link>

          {user ? (
            <div className="auth-menu">
              <Link to="/cart" className="cart-link">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="cart-badge">{cartCount}</span>
                )}
              </Link>
              <div className="user-dropdown-container">
                <button 
                  className="user-btn" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                >
                  <User size={18} />
                  <span>{user.username}</span>
                </button>
                
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="dropdown-menu"
                    >
                      {user.is_admin ? (
                        <Link to="/admin/dashboard" className="dropdown-item">
                          <LayoutDashboard size={16} /> Admin Dashboard
                        </Link>
                      ) : (
                        <Link to="/dashboard" className="dropdown-item">
                          <LayoutDashboard size={16} /> Dashboard
                        </Link>
                      )}
                      <div className="dropdown-divider"></div>
                      <button onClick={handleLogout} className="dropdown-item logout">
                        <LogOut size={16} /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="auth-actions">
              <Link to="/login" className="login-btn">Login</Link>
              <Link to="/register" className="register-btn">Get Started</Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="mobile-toggle" onClick={toggleMenu}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mobile-menu"
          >
            <Link to="/">Home</Link>
            <Link to="/resources">Resources</Link>
            
            {user ? (
              <>
                <Link to="/cart" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <ShoppingCart size={18} className="icon" /> Cart
                  {cartCount > 0 && (
                    <span style={{
                      marginLeft: '0.5rem', background: '#ef4444', color: 'white',
                      borderRadius: '50%', padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 'bold'
                    }}>
                      {cartCount}
                    </span>
                  )}
                </Link>
                {user.is_admin ? (
                  <Link to="/admin/dashboard"><LayoutDashboard size={18} className="icon" /> Admin Dashboard</Link>
                ) : (
                  <Link to="/dashboard"><LayoutDashboard size={18} className="icon" /> Dashboard</Link>
                )}
                <button onClick={handleLogout} className="mobile-logout"><LogOut size={18} className="icon" /> Logout</button>
              </>
            ) : (
              <div className="mobile-auth-actions">
                <Link to="/login" className="mobile-login-btn">Login</Link>
                <Link to="/register" className="mobile-register-btn">Get Started</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

export default Navbar;
