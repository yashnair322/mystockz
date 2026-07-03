import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Lock, AlertCircle, ArrowRight, Loader,
  TrendingUp, Shield, BarChart2, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TradingHeroBackground from '../components/TradingHeroBackground';
import '../styles/Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(formData.username, formData.password, formData.remember);
      if (loggedInUser && loggedInUser.is_admin) navigate('/admin/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split">
      {/* LEFT — animated chart panel */}
      <aside className="auth-panel">
        <div className="auth-panel-bg">
          <TradingHeroBackground />
        </div>
        <div className="auth-panel-content">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="auth-brand"
          >
            <Sparkles size={18} className="text-purple-300" />
            <span>Mystockz</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="auth-panel-title"
          >
            Welcome back to your <span className="gradient-text">trading edge</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="auth-panel-subtitle"
          >
            Sign in to access premium scripts, your dashboard, and your TradingView-linked subscriptions.
          </motion.p>

          <ul className="auth-feature-list">
            {[
              { icon: TrendingUp, label: 'Real-time market indicators' },
              { icon: BarChart2,  label: 'Data-driven analysis tools' },
              { icon: Shield,     label: 'Secure, encrypted sessions' },
            ].map(({ icon: Icon, label }, i) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.1 }}
              >
                <span className="auth-feature-icon"><Icon size={16} /></span>
                {label}
              </motion.li>
            ))}
          </ul>
        </div>
      </aside>

      {/* RIGHT — auth form */}
      <main className="auth-form-side">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="auth-card glass-card glass-card--spotlight"
        >
          <div className="auth-header">
            <h2>Welcome <span className="gradient-text">Back</span></h2>
            <p>Login to access your dashboard</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="error-message">
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="floating-input">
              <input
                type="text"
                id="username"
                name="username"
                placeholder=" "
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="username"
                style={{ paddingLeft: '2.75rem' }}
              />
              <label htmlFor="username" style={{ left: '2.75rem' }}>Username or Email</label>
              <Mail size={18} className="floating-input-icon" />
            </div>

            <div className="floating-input">
              <input
                type="password"
                id="password"
                name="password"
                placeholder=" "
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                style={{ paddingLeft: '2.75rem' }}
              />
              <label htmlFor="password" style={{ left: '2.75rem' }}>Password</label>
              <Lock size={18} className="floating-input-icon" />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" name="remember" checked={formData.remember} onChange={handleChange} />
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button type="submit" className="btn-shine w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="spin" size={20} /> : 'Sign In'}
              {!isSubmitting && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?
            <Link to="/register" className="auth-link">Sign up here</Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Login;
