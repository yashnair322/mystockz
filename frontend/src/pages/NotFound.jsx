import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: 'calc(100vh - 140px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-primary)',
      padding: '2rem'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4rem 3rem',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(16px)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, -5, 5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '1.5rem',
            borderRadius: '50%',
            border: '2px dashed rgba(239, 68, 68, 0.3)',
            display: 'inline-flex',
            marginBottom: '0.5rem'
          }}
        >
          <AlertTriangle size={48} style={{ color: '#ef4444' }} />
        </motion.div>

        <h1 style={{ 
          fontSize: '4.5rem', 
          fontWeight: '900', 
          margin: 0,
          background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          404
        </h1>

        <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>Page Not Found</h2>
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          lineHeight: '1.6', 
          fontSize: '0.98rem',
          margin: 0
        }}>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            padding: '0.8rem 1.8rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Home size={18} />
          Go to Homepage
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
