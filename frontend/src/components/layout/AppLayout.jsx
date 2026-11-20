import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const titles = {
  '/': 'Dashboard',
  '/projects': 'Project Management',
  '/clients': 'Client Management',
  '/finance': 'Finance & Accounting',
  '/finance/invoices': 'Invoices',
  '/inventory': 'Inventory Management',
  '/procurement': 'Procurement',
  '/vendors': 'Vendor Management',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const title =
    titles[location.pathname] ||
    (location.pathname.startsWith('/projects/')
      ? 'Project Details'
      : location.pathname.startsWith('/clients/')
        ? 'Client Details'
        : location.pathname.startsWith('/vendors/')
          ? 'Vendor Details'
          : 'Zar-E-Fishan');

  return (
    <div className="app-shell">
      <div className={`overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main-area">
        <Navbar title={title} onMenu={() => setOpen((v) => !v)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
