import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import ReportsPage from './components/Reports/ReportsPage';
import SalesPage from './components/Sales/SalesPage';
import InventoryPage from './components/Inventory/InventoryPage';
import InvoicesPage from './components/Invoices/InvoicesPage';
import LoansPage from './components/Loans/LoansPage';
import SettingsPage from './components/Settings/SettingsPage';

const pageTitles = {
  '/': 'Dashboard',
  '/sales': 'Sales Terminal',
  '/inventory': 'Inventory Management',
  '/invoices': 'Invoices',
  '/loans': 'Borrowers & Credit Management',
  '/settings': 'Settings'
};

export default function App() {
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for route changes
  React.useEffect(() => {
    setCurrentPath(window.location.pathname);
  });

  const title = pageTitles[currentPath] || 'Dashboard';

  return (
    <>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Topbar title={title} />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<ReportsPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
      />
    </>
  );
}
