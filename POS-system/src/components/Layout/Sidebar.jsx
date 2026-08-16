import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiGrid, FiShoppingCart, FiPackage, FiSettings, FiAlertTriangle, FiFileText } from 'react-icons/fi';
import { reportsAPI } from '../../utils/api';

export default function Sidebar() {
  const location = useLocation();
  const [lowStockCount, setLowStockCount] = React.useState(0);

  React.useEffect(() => {
    loadLowStockCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadLowStockCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLowStockCount = async () => {
    try {
      const { data } = await reportsAPI.getDailySummary();
      setLowStockCount(data.lowStockCount || 0);
    } catch (err) {
      // Silently fail — server may not be ready yet
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <FiGrid /> },
    { path: '/sales', label: 'Sales Terminal', icon: <FiShoppingCart /> },
    { path: '/inventory', label: 'Inventory', icon: <FiPackage />, badge: lowStockCount > 0 ? lowStockCount : null },
    { path: '/invoices', label: 'Invoices', icon: <FiFileText /> },
    { path: '/settings', label: 'Settings', icon: <FiSettings /> }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛒</div>
          <div className="sidebar-logo-text">
            <h1>Abeywickrama</h1>
            <span>Super Mart POS</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
            {item.badge && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Abeywickrama Super Mart</p>
        <p>POS System v1.0.0</p>
      </div>
    </aside>
  );
}
