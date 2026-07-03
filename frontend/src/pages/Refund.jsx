import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const Refund = () => {
  return (
    <div className="container py-5" style={{ color: 'var(--text-primary)', maxWidth: '800px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <RefreshCw size={36} style={{ color: '#ec4899' }} />
          <h2 style={{ margin: 0, fontWeight: 'bold' }}>Refund Policy</h2>
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
          gap: '1.25rem'
        }}>
          <p>
            We provide users with an opportunity to explore the platform through a <strong>demo/trial</strong> before purchasing any subscription or service.
          </p>

          <p>
            Since access to dashboards, analytical tools, signals, digital resources, and platform features is delivered digitally, all purchases and subscription payments are <strong>final in nature</strong>. No refund requests will be entertained once the payment has been completed, irrespective of whether a demo/trial was taken or platform access has been activated.
          </p>

          <p>
            By subscribing to our services, users acknowledge that they have understood and evaluated the platform features, functionality, and scope before making the purchase.
          </p>

          <p>
            We do <strong>not</strong> guarantee profits, returns, or trading performance, and refunds will not be provided based on trading losses, market conditions, strategy performance, or unmet expectations.
          </p>

          <h3 style={{ color: '#f472b6', margin: '0.75rem 0 0.25rem', fontWeight: 'bold', fontSize: '1.15rem' }}>Limited Exceptions</h3>
          <p>
            In case of <strong>duplicate payments</strong> or <strong>technical billing errors from our side</strong>, eligible refunds may be processed after verification.
          </p>

          <h3 style={{ color: '#f472b6', margin: '0.75rem 0 0.25rem', fontWeight: 'bold', fontSize: '1.15rem' }}>Contacting Support</h3>
          <p>
            For any billing-related concerns, users may contact our support team within <strong>7 days of the transaction date</strong> at{' '}
            <a href="mailto:support@mystockz.in" style={{ color: '#f9a8d4' }}>support@mystockz.in</a>.
          </p>

          <p>
            Subscription fees are charged for access to analytical tools, dashboards, and technology infrastructure, and <strong>not for guaranteed market outcomes</strong>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Refund;
