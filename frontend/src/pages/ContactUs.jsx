import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Phone, Contact, Send,
  AlertCircle, CheckCircle, Loader,
} from 'lucide-react';
import api, { friendlyError } from '../utils/api';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', message: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setIsSubmitting(true);
    try {
      const response = await api.post('/contact', formData);
      if (response.data.success) {
        setStatus({ type: 'success', message: response.data.message || 'Thanks! Your message has been sent.' });
        setFormData({ first_name: '', last_name: '', email: '', message: '' });
      } else {
        setStatus({ type: 'error', message: friendlyError({ response: { data: response.data } }, 'We could not send your message. Please try again.') });
      }
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error, 'We could not send your message. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="section-header text-center"
        style={{ marginBottom: '3rem', textAlign: 'center' }}
      >
        <span className="section-eyebrow">
          <Contact size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Get in touch
        </span>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Contact <span className="gradient-text">Us</span>
        </h2>
        <p className="section-subtitle" style={{ margin: '0 auto' }}>
          Questions, feedback, or partnership inquiries — we'd love to hear from you.
        </p>
        <div className="header-line center" />
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Contact info card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card"
          style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center' }}
        >
          {[
            { icon: Mail, label: 'EMAIL US', value: 'info@mystockz.in', href: 'mailto:info@mystockz.in' },
            { icon: Phone, label: 'CALL US', value: '+91 9537517099', href: 'tel:+919537517099' },
          ].map(({ icon: Icon, label, value, href }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
              style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                color: '#c4b5fd', flexShrink: 0,
              }}>
                <Icon size={20} />
              </span>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '0.35rem' }}>
                  {label}
                </span>
                {href ? (
                  <a href={href} style={{ color: '#c4b5fd', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 500 }}>
                    {value}
                  </a>
                ) : (
                  value
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card glass-card--spotlight"
          style={{ padding: '2.5rem' }}
        >
          <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 700, fontSize: '1.35rem' }}>
            Send a <span className="gradient-text">Message</span>
          </h3>

          {status.message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={status.type === 'success' ? 'success-message' : 'error-message'}
            >
              {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {status.message}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="floating-input">
                <input type="text" id="first_name" name="first_name" placeholder=" "
                  value={formData.first_name} onChange={handleChange} required autoComplete="given-name" />
                <label htmlFor="first_name">First name</label>
              </div>
              <div className="floating-input">
                <input type="text" id="last_name" name="last_name" placeholder=" "
                  value={formData.last_name} onChange={handleChange} required autoComplete="family-name" />
                <label htmlFor="last_name">Last name</label>
              </div>
            </div>

            <div className="floating-input">
              <input type="email" id="email" name="email" placeholder=" "
                value={formData.email} onChange={handleChange} required autoComplete="email" />
              <label htmlFor="email">Email address</label>
            </div>

            <div className="floating-input">
              <textarea id="message" name="message" placeholder=" " rows={4}
                value={formData.message} onChange={handleChange} required style={{ resize: 'vertical' }} />
              <label htmlFor="message">Your message</label>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-shine w-full">
              {isSubmitting ? (
                <><Loader className="spin" size={18} /> Sending...</>
              ) : (
                <><Send size={18} /> Send Message</>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
