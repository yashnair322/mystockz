
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, FileCode, ShoppingBag, CheckSquare, PlayCircle } from 'lucide-react';
import '../../styles/Admin.css';

const AdminLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!user || !user.is_admin) return <Navigate to="/" />;

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-nav">
          <Link to="/admin/dashboard" className={`admin-nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Overview
          </Link>
          <Link to="/admin/users" className={`admin-nav-link ${location.pathname.includes('/admin/users') ? 'active' : ''}`}>
            <Users size={20} /> Users
          </Link>
          <Link to="/admin/scripts" className={`admin-nav-link ${location.pathname.includes('/admin/scripts') ? 'active' : ''}`}>
            <FileCode size={20} /> Indicators
          </Link>
          <Link to="/admin/orders" className={`admin-nav-link ${location.pathname.includes('/admin/orders') ? 'active' : ''}`}>
            <ShoppingBag size={20} /> Orders
          </Link>
          <Link to="/admin/approvals" className={`admin-nav-link ${location.pathname.includes('/admin/approvals') ? 'active' : ''}`}>
            <CheckSquare size={20} /> Approvals
          </Link>
          <Link to="/admin/demo-requests" className={`admin-nav-link ${location.pathname.includes('/admin/demo-requests') ? 'active' : ''}`}>
            <PlayCircle size={20} /> Demo Requests
          </Link>
        </nav>
      </aside>
      
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
