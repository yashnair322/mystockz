import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Key, Lock, AlertCircle, ArrowRight, Loader, CheckCircle } from 'lucide-react';
import api, { friendlyError } from '../utils/api';
import '../styles/Auth.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setSuccess(res.data.message || 'A reset code has been sent to your email.');
        setStep(2);
      } else {
        setError(friendlyError({ response: { data: res.data } }, 'We could not send a reset code. Please try again.'));
      }
    } catch (err) {
      setError(friendlyError(err, 'We could not send a reset code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters long');

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', { code, new_password: newPassword });
      if (res.data.success) {
        setSuccess(res.data.message || 'Password updated successfully. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(friendlyError({ response: { data: res.data } }, 'We could not reset your password. Please check the code and try again.'));
      }
    } catch (err) {
      setError(friendlyError(err, 'We could not reset your password. Please check the code and try again.'));
    } finally {
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
        style={{ maxWidth: '460px' }}
      >
        <div className="auth-header">
          <h2>Reset <span className="gradient-text">Password</span></h2>
          <p>{step === 1 ? 'Enter your email to receive a reset code' : 'Enter your reset code and new password'}</p>
        </div>

        {/* progress dots */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {[1, 2].map(n => (
            <span
              key={n}
              style={{
                width: step >= n ? 32 : 12,
                height: 6,
                borderRadius: 3,
                background: step >= n ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.08)',
                transition: 'width 0.35s ease, background 0.35s ease',
              }}
            />
          ))}
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

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRequestCode}
              noValidate
            >
              <div className="floating-input">
                <input
                  type="email" id="email" placeholder=" "
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email"
                  style={{ paddingLeft: '2.75rem' }}
                />
                <label htmlFor="email" style={{ left: '2.75rem' }}>Email address</label>
                <Mail size={18} className="floating-input-icon" />
              </div>
              <button type="submit" className="btn-shine w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="spin" size={20} /> : 'Send Reset Code'}
                {!isSubmitting && <ArrowRight size={20} />}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleResetPassword}
              noValidate
            >
              <div className="floating-input">
                <input type="text" id="code" placeholder=" "
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  maxLength="6" required autoComplete="one-time-code"
                  style={{ paddingLeft: '2.75rem' }} />
                <label htmlFor="code" style={{ left: '2.75rem' }}>6-digit code</label>
                <Key size={18} className="floating-input-icon" />
              </div>
              <div className="floating-input">
                <input type="password" id="new-password" placeholder=" "
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  required minLength="8" autoComplete="new-password"
                  style={{ paddingLeft: '2.75rem' }} />
                <label htmlFor="new-password" style={{ left: '2.75rem' }}>New password</label>
                <Lock size={18} className="floating-input-icon" />
              </div>
              <div className="floating-input">
                <input type="password" id="confirm-password" placeholder=" "
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  required minLength="8" autoComplete="new-password"
                  style={{ paddingLeft: '2.75rem' }} />
                <label htmlFor="confirm-password" style={{ left: '2.75rem' }}>Confirm new password</label>
                <Lock size={18} className="floating-input-icon" />
              </div>
              <button type="submit" className="btn-shine w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="spin" size={20} /> : 'Reset Password'}
                {!isSubmitting && <CheckCircle size={20} />}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="auth-footer">
          Remember your password? <Link to="/login" className="auth-link">Back to Login</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
