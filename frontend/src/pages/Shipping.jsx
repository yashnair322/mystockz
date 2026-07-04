import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';

const Shipping = () => {
  return (
    <div className="container py-5" style={{ color: 'var(--text-primary)', maxWidth: '800px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Truck size={36} style={{ color: '#fbbf24' }} />
          <h2 style={{ margin: 0, fontWeight: 'bold' }}>Shipping Policy</h2>
        </div>

        <div style={{ 
          background: 'rgba(15, 23, 42, 0.5)', 
          padding: '2.5rem', 
          borderRadius: '16px', 
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(12px)',
          lineHeight: '1.7',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <p>At <strong>mystockz.in</strong>, we strive to provide quick access to our educational resources after purchase. Since our services consist of digital assets, here is how the delivery works:</p>

          <h4 style={{ color: '#fbbf24', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Resource Delivery Timeline</h4>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Access to purchased technical scripts and indicators will be provided within <strong>1-2 business days</strong> after successful payment confirmation.</li>
            <li>You will receive an automated email notification when your resource access is activated.</li>
            <li>All resources are delivered <strong>digitally</strong> through your account dashboard.</li>
          </ul>

          <h4 style={{ color: '#fbbf24', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Access Instructions</h4>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Log in to your account.</li>
            <li>Visit your dashboard to access purchased resources.</li>
            <li>Follow the provided instructions to integrate the resources with your analytical tools (like TradingView).</li>
          </ul>

          <h4 style={{ color: '#fbbf24', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Support</h4>
          <p style={{ margin: 0 }}>
            If you have not received access to your purchased resources within 2 business days, please contact our support team immediately at <strong>info@mystockz.in</strong>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Shipping;
