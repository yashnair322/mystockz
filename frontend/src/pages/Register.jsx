import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Lock, User, AlertCircle, ArrowRight, Loader,
  Sparkles, Rocket, Award, Gift,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TradingHeroBackground from '../components/TradingHeroBackground';
import '../styles/Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', confirm_password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirm_password) {
      return setError('Passwords do not match');
    }
    setIsSubmitting(true);
    try {
      await register(formData);
      navigate('/verify-email');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split">
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
            Start your <span className="gradient-text">trading journey</span> today
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="auth-panel-subtitle"
          >
            Create a free account to unlock premium scripts, indicators, and an evolving toolbox crafted for modern traders.
          </motion.p>

          <ul className="auth-feature-list">
            {[
              { icon: Rocket, label: 'Quick onboarding · setup in minutes' },
              { icon: Award,  label: 'Access to premium curated scripts' },
              { icon: Gift,   label: 'Free starter resources upon signup' },
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

      <main className="auth-form-side">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="auth-card glass-card glass-card--spotlight"
          style={{ maxWidth: '550px' }}
        >
          <div className="auth-header">
            <h2>Create <span className="gradient-text">Account</span></h2>
            <p>Join Mystockz to access premium tools</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="error-message">
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="floating-input">
                <input type="text" id="first_name" name="first_name" placeholder=" "
                  value={formData.first_name} onChange={handleChange}
                  autoComplete="given-name" style={{ paddingLeft: '2.75rem' }} />
                <label htmlFor="first_name" style={{ left: '2.75rem' }}>First name</label>
                <User size={18} className="floating-input-icon" />
              </div>
              <div className="floating-input">
                <input type="text" id="last_name" name="last_name" placeholder=" "
                  value={formData.last_name} onChange={handleChange}
                  autoComplete="family-name" style={{ paddingLeft: '2.75rem' }} />
                <label htmlFor="last_name" style={{ left: '2.75rem' }}>Last name</label>
                <User size={18} className="floating-input-icon" />
              </div>
            </div>

            <div className="floating-input">
              <input type="text" id="username" name="username" placeholder=" "
                value={formData.username} onChange={handleChange} required
                autoComplete="username" style={{ paddingLeft: '2.75rem' }} />
              <label htmlFor="username" style={{ left: '2.75rem' }}>Username</label>
              <User size={18} className="floating-input-icon" />
            </div>

            <div className="floating-input">
              <input type="email" id="email" name="email" placeholder=" "
                value={formData.email} onChange={handleChange} required
                autoComplete="email" style={{ paddingLeft: '2.75rem' }} />
              <label htmlFor="email" style={{ left: '2.75rem' }}>Email address</label>
              <Mail size={18} className="floating-input-icon" />
            </div>

            <div className="floating-input">
              <input type="password" id="password" name="password" placeholder=" "
                value={formData.password} onChange={handleChange} required
                autoComplete="new-password" style={{ paddingLeft: '2.75rem' }} />
              <label htmlFor="password" style={{ left: '2.75rem' }}>Password</label>
              <Lock size={18} className="floating-input-icon" />
            </div>

            <div className="floating-input">
              <input type="password" id="confirm_password" name="confirm_password" placeholder=" "
                value={formData.confirm_password} onChange={handleChange} required
                autoComplete="new-password" style={{ paddingLeft: '2.75rem' }} />
              <label htmlFor="confirm_password" style={{ left: '2.75rem' }}>Confirm password</label>
              <Lock size={18} className="floating-input-icon" />
            </div>

            <button type="submit" className="btn-shine w-full" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
              {isSubmitting ? <Loader className="spin" size={20} /> : 'Create Account'}
              {!isSubmitting && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?
            <Link to="/login" className="auth-link">Log in</Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Register;
