import { Link } from 'react-router-dom';
import {
  Home, LineChart, LayoutDashboard, FileText, ShieldCheck,
  RefreshCw, Truck, Mail, Heart,
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const linkStyle = {
    color: 'inherit',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    transition: 'color 0.2s ease, transform 0.2s ease',
    fontSize: '0.95rem',
  };

  const headingStyle = {
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '1.05rem',
    margin: 0,
    letterSpacing: '0.02em',
    position: 'relative',
    paddingBottom: '0.6rem',
  };

  return (
    <footer
      style={{
        position: 'relative',
        background:
          'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(10, 15, 30, 0.95) 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '5rem 2rem 2rem',
        color: 'var(--text-secondary)',
        marginTop: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Accent strip at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, #ec4899, transparent)',
          opacity: 0.7,
        }}
      />

      {/* Decorative blurred shapes */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          left: '-80px',
          width: '300px',
          height: '300px',
          background: 'rgba(59, 130, 246, 0.12)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          right: '-100px',
          width: '350px',
          height: '350px',
          background: 'rgba(139, 92, 246, 0.12)',
          borderRadius: '50%',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '3rem',
          marginBottom: '3rem',
        }}
      >
        {/* Brand block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h5
            style={{
              fontWeight: 800,
              fontSize: '1.4rem',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            <LineChart
              size={22}
              style={{
                color: '#a78bfa',
                filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))',
              }}
            />
            mystockz.in
          </h5>
          <p style={{
            margin: 0,
            fontWeight: 600,
            color: '#a78bfa',
            fontSize: '0.95rem',
            letterSpacing: '0.02em',
          }}>
            Visual Market Intelligence for Smart Trading
          </p>
          <p style={{ lineHeight: 1.7, fontSize: '0.95rem', maxWidth: '320px' }}>
            Educational platform providing market analysis tools and technical
            indicators. Enhance your understanding of the markets with our
            premium resources.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h5 style={headingStyle}>Resources</h5>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <li><Link to="/" style={linkStyle} className="footer-link"><Home size={16} /> Home</Link></li>
            <li><Link to="/resources" style={linkStyle} className="footer-link"><LineChart size={16} /> Analysis Tools</Link></li>
            <li><Link to="/dashboard" style={linkStyle} className="footer-link"><LayoutDashboard size={16} /> Dashboard</Link></li>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h5 style={headingStyle}>Policies & Legal</h5>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <li><Link to="/terms" style={linkStyle} className="footer-link"><FileText size={16} /> Terms of Use</Link></li>
            <li><Link to="/privacy" style={linkStyle} className="footer-link"><ShieldCheck size={16} /> Privacy Policy</Link></li>
            <li><Link to="/refund" style={linkStyle} className="footer-link"><RefreshCw size={16} /> Refund Policy</Link></li>
            <li><Link to="/shipping" style={linkStyle} className="footer-link"><Truck size={16} /> Shipping Policy</Link></li>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h5 style={headingStyle}>Support</h5>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <li><Link to="/contact" style={linkStyle} className="footer-link"><Mail size={16} /> Contact Us</Link></li>
          </ul>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          maxWidth: '1200px',
          margin: '0 auto',
          fontSize: '0.9rem',
        }}
      >
        <p style={{ margin: 0 }}>
          &copy; {currentYear} Mystockz. All rights reserved.
        </p>
        <p
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
          }}
        >
          Crafted with
          <Heart
            size={14}
            style={{
              color: '#ec4899',
              fill: '#ec4899',
              filter: 'drop-shadow(0 0 6px rgba(236, 72, 153, 0.6))',
            }}
          />
          for traders.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
