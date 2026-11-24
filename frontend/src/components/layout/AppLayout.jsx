import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const titles = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/clients': 'Clients',
  '/crm': 'CRM Pipeline',
  '/finance': 'Finance Overview',
  '/finance/invoices': 'Invoices',
  '/finance/quotations': 'Quotations',
  '/finance/accounts': 'Cash & Bank Accounts',
  '/finance/expenses': 'General Expenses',
  '/finance/ledger': 'Ledger',
  '/finance/returns': 'Sales Returns',
  '/finance/pending': 'Pending Payments',
  '/inventory': 'Inventory',
  '/procurement': 'Procurement',
  '/vendors': 'Vendors',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

const reportTitles = {
  cashFlow: 'Cash Flow Report',
  profitLoss: 'Profit & Loss',
  balanceSheet: 'Balance Sheet',
  finance: 'Income & Expense Report',
  projects: 'Projects Report',
  clients: 'Clients Report',
  inventory: 'Inventory Report',
  procurement: 'Procurement Report',
  vendors: 'Vendors Report',
};

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('zf_sidebar_collapsed') === '1');
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('zf_sidebar_collapsed', collapsed ? '1' : '0');
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '84px' : '272px',
    );
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  let title = titles[location.pathname] || 'Zar-E-Fishan';
  if (location.pathname.startsWith('/projects/')) title = 'Project Details';
  else if (location.pathname.startsWith('/clients/')) title = 'Client Details';
  else if (location.pathname.startsWith('/vendors/')) title = 'Vendor Details';
  else if (location.pathname === '/reports') {
    const type = new URLSearchParams(location.search).get('type');
    title = reportTitles[type] || 'Reports';
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={`overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
      />
      <div className="main-area">
        <Navbar title={title} onMenu={() => setMobileOpen((v) => !v)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
