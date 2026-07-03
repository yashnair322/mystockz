import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="container py-5" style={{ color: 'var(--text-primary)', maxWidth: '800px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Shield size={36} style={{ color: '#10b981' }} />
          <h2 style={{ margin: 0, fontWeight: 'bold' }}>Privacy Policy</h2>
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
          <p>At <strong>mystockz.in</strong> ("we", "us", or "our"), we are committed to safeguarding your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you visit and interact with our website.</p>

          <h4 style={{ color: '#34d399', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Information We Collect</h4>
          <p>We may collect the following information from users:</p>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Email Address:</strong> Collected during sign-up or purchases for communication and account-related purposes.</li>
            <li><strong>Payment Information:</strong> Processed securely through third-party payment gateways. We do not store your full payment details on our servers.</li>
            <li><strong>Cookies and Usage Data:</strong> We use cookies and similar technologies to enhance your experience, understand usage patterns, and improve our services.</li>
          </ul>

          <h4 style={{ color: '#34d399', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>How We Use Your Information</h4>
          <p>Your information may be used for the following purposes:</p>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>To provide, maintain, and improve our educational resources and services.</li>
            <li>To securely process payments and manage your account.</li>
            <li>To enhance user experience and website performance.</li>
          </ul>

          <h4 style={{ color: '#34d399', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Cookies</h4>
          <p>Cookies are small files stored on your device that help improve site functionality. You may choose to disable cookies via your browser settings, but please note that this may affect your ability to use certain features of the site, particularly those related to learning tools and user preferences.</p>

          <h4 style={{ color: '#34d399', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Third-Party Services</h4>
          <p>We may engage trusted third-party services such as payment gateways and analytics providers. These third parties may collect information as governed by their own privacy policies. While we select only reputable partners, we are not responsible for how these third parties handle or use your data.</p>

          <h4 style={{ color: '#34d399', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Data Security</h4>
          <p>We implement standard security measures to protect your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>

          <h4 style={{ color: '#34d399', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>User Rights</h4>
          <p>As a user, you have the right to:</p>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Access or Correct your personal information.</li>
            <li>Request Deletion of your data, subject to any legal or contractual obligations.</li>
          </ul>

          <h4 style={{ color: '#34d399', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>Contact Us</h4>
          <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
          <p style={{ margin: 0 }}><strong>Email:</strong> support@mystockz.in</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Privacy;
