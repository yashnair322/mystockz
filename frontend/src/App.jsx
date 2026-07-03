import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuroraBackground from './components/effects/AuroraBackground';
import ScrollProgress from './components/effects/ScrollProgress';
import NoiseOverlay from './components/effects/NoiseOverlay';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Cart from './pages/Cart';
import Resources from './pages/Resources';
import ScriptDetail from './pages/ScriptDetail';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Shipping from './pages/Shipping';
import ContactUs from './pages/ContactUs';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminUsers from './pages/admin/AdminUsers';
import AdminScripts from './pages/admin/AdminScripts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminDemoRequests from './pages/admin/AdminDemoRequests';

import './App.css';
import './styles/Home.css';

/**
 * Re-keys its child wrapper on every route change so the page-fade keyframe
 * runs each navigation — gives a smooth fade/slide between routes.
 */
const PageTransitions = ({ children }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-fade">
      {children}
    </div>
  );
};

function App() {
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AuroraBackground />
      <NoiseOverlay />
      <ScrollProgress />
      <Navbar />
      <main className="main-content" style={{ marginTop: '70px', flex: '1 0 auto' }}>
        <PageTransitions>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/scripts/:id" element={<ScriptDetail />} />

            {/* Authentication & Dashboard Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/admin/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* User Dashboard & Section Shortcuts */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/purchases" element={<Dashboard />} />
            <Route path="/profile" element={<Dashboard />} />
            <Route path="/tradingview" element={<Dashboard />} />
            <Route path="/tradingview-id" element={<Dashboard />} />

            <Route path="/cart" element={<Cart />} />

            {/* Policy & Static Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/ContactUs" element={<ContactUs />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="approvals" element={<AdminApprovals />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="scripts" element={<AdminScripts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="demo-requests" element={<AdminDemoRequests />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransitions>
      </main>
      <Footer />
    </div>
  )
}

export default App;
