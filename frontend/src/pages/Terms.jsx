import { motion } from 'framer-motion';
import { FileText, ShieldAlert } from 'lucide-react';

const Terms = () => {
  return (
    <div className="container py-5" style={{ color: 'var(--text-primary)', maxWidth: '800px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <FileText size={36} style={{ color: '#3b82f6' }} />
          <h2 style={{ margin: 0, fontWeight: 'bold' }}>Terms of Use</h2>
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
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '1rem' }}>
            <ShieldAlert size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ color: '#f87171', fontSize: '0.95rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.4rem' }}>Disclaimer:</strong>
              This website/platform is intended solely for educational, informational, and analytical purposes. We are <strong>not registered with the Securities and Exchange Board of India (SEBI)</strong> as a Research Analyst or Investment Adviser.
            </div>
          </div>

          <p>
            The dashboards, indicators, screeners, signals, market insights, technical analysis tools, and other analytical content provided on this platform are based on quantitative and technical analysis and should not be construed as investment advice, research recommendations, or buy/sell recommendations for any securities.
          </p>

          <p>
            Users are <strong>solely responsible</strong> for their investment and trading decisions. Investments in securities markets are subject to market risks, and past performance does not guarantee future results.
          </p>

          <p>
            We do <strong>not</strong> provide portfolio management services, assured returns, guaranteed profits, or personalized financial advice.
          </p>

          <p>
            Before making any investment or trading decision, users should conduct their own research and consult a <strong>SEBI-registered financial advisor</strong> or investment professional.
          </p>

          <p>
            By using this platform, users acknowledge that all market-related decisions are taken at their own risk and discretion.
          </p>

          <h3 style={{ margin: '1rem 0 0.5rem', color: '#60a5fa', fontWeight: 'bold', fontSize: '1.15rem' }}>
            By using mystockz.in, you acknowledge and agree that:
          </h3>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>You are using all resources for <strong>educational purposes only</strong>.</li>
            <li>You are solely responsible for your personal use of any content or tools.</li>
            <li>You will not hold mystockz.in or its team liable for any outcomes.</li>
          </ul>

          <p style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            We reserve the right to revise these Terms and Conditions at any time. Continued use of mystockz.in constitutes acceptance of any updates.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;
