// Central SEO metadata. Every route maps to a UNIQUE title + meta description.
// Dynamic script pages (/scripts/:id) are overridden by ScriptDetail once the
// script loads; this file only provides their generic fallback.

export const SITE_NAME = 'Mystockz';

export const DEFAULT_DESCRIPTION =
  'Mystockz offers premium TradingView indicators and visual market-analysis tools to help you trade smarter.';

// Exact-path metadata.
const META = {
  '/': {
    title: '',
    description:
      'Mystockz — premium TradingView indicators and visual market-analysis tools. Explore curated trading scripts, try a free demo, and check out securely.',
  },
  '/resources': {
    title: 'Resources',
    description:
      "Browse Mystockz's premium TradingView indicators and market-analysis tools. Compare features, view pricing, and request a free demo before you buy.",
  },
  '/terms': {
    title: 'Terms & Conditions',
    description:
      'Read the terms and conditions that govern your use of the Mystockz website and its trading-analysis resources.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description:
      'Learn how Mystockz collects, uses, and safeguards your personal information when you visit and interact with our website.',
  },
  '/refund': {
    title: 'Refund Policy',
    description:
      'Understand the Mystockz no-refund policy for digital subscriptions and how free demos let you evaluate every tool before purchase.',
  },
  '/shipping': {
    title: 'Delivery Policy',
    description:
      'How Mystockz delivers digital access to purchased TradingView tools, and what to expect after your purchase is complete.',
  },
  '/contact': {
    title: 'Contact Us',
    description:
      'Get in touch with the Mystockz team for support, product demos, or any questions about our TradingView indicators.',
  },
  '/login': {
    title: 'Login',
    description:
      'Sign in to your Mystockz account to access your purchased indicators, subscriptions, and dashboard.',
    noindex: true,
  },
  '/register': {
    title: 'Create Account',
    description:
      'Create a free Mystockz account to buy premium indicators, request demos, and manage your subscriptions.',
    noindex: true,
  },
  '/forgot-password': {
    title: 'Reset Password',
    description: 'Securely reset the password for your Mystockz account.',
    noindex: true,
  },
  '/verify-email': {
    title: 'Verify Email',
    description: 'Verify your email address to activate your Mystockz account.',
    noindex: true,
  },
  '/cart': {
    title: 'Cart',
    description: 'Review the Mystockz indicators in your cart and complete your checkout securely.',
    noindex: true,
  },
  '/dashboard': {
    title: 'Dashboard',
    description:
      'Your Mystockz dashboard — manage subscriptions, your TradingView ID, and account settings.',
    noindex: true,
  },
};

const DASHBOARD_ALIASES = ['/purchases', '/profile', '/tradingview', '/tradingview-id'];

/** Returns { title, description, noindex } for a given pathname. */
export function getMetaForPath(pathname) {
  if (META[pathname]) return META[pathname];
  if (DASHBOARD_ALIASES.includes(pathname)) return META['/dashboard'];
  if (pathname === '/ContactUs') return META['/contact'];
  if (pathname === '/auth/admin/login') {
    return { title: 'Admin Login', description: 'Restricted administrator sign-in for Mystockz.', noindex: true };
  }
  if (pathname.startsWith('/admin')) {
    return { title: 'Admin', description: 'Mystockz administration area.', noindex: true };
  }
  if (pathname.startsWith('/scripts/')) {
    // Generic fallback; ScriptDetail overrides with the specific script.
    return {
      title: 'Trading Indicator',
      description:
        'Explore this premium TradingView indicator on Mystockz — features, pricing, and a free demo option.',
    };
  }
  return {
    title: 'Page Not Found',
    description:
      "The page you're looking for could not be found. Explore Mystockz's premium trading tools instead.",
    noindex: true,
  };
}
