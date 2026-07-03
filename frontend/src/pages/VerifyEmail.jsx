import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, AlertCircle, CheckCircle, ArrowRight, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await verifyEmail(code);
      setSuccess('Email verified successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Verification failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-center">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55 }}
        className="auth-card glass-card glass-card--spotlight"
        style={{ maxWidth: '440px' }}
      >
        <div className="auth-header">
          <motion.div
            initial={{ rotate: -20, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd',
              marginBottom: '1rem',
            }}
          >
            <KeyRound size={28} />
          </motion.div>
          <h2>Verify <span className="gradient-text">Email</span></h2>
          <p>Enter the 6-digit code sent to your inbox</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="error-message">
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="success-message">
            <CheckCircle size={18} /> {success}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="floating-input">
            <input
              type="text"
              id="verification-code"
              placeholder=" "
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              required
              autoComplete="one-time-code"
              style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}
            />
            <label htmlFor="verification-code">6-Digit Code</label>
          </div>

          <button type="submit" className="btn-shine w-full" disabled={isSubmitting || code.length < 6 || !!success}>
            {isSubmitting ? <Loader className="spin" size={20} /> : 'Verify Account'}
            {!isSubmitting && <ArrowRight size={20} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
