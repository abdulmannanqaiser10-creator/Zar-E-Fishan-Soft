import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Contact,
  Wallet,
  FileText,
  FileSpreadsheet,
  Landmark,
  Receipt,
  BookOpen,
  RotateCcw,
  Bell,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Globe,
  Settings,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/crm', label: 'CRM', icon: Contact },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/finance/invoices', label: 'Invoices', icon: FileText },
  { to: '/finance/quotations', label: 'Quotations', icon: FileSpreadsheet },
  { to: '/finance/accounts', label: 'Accounts', icon: Landmark },
  { to: '/finance/expenses', label: 'Expenses', icon: Receipt },
  { to: '/finance/ledger', label: 'Ledger', icon: BookOpen },
  { to: '/finance/returns', label: 'Returns', icon: RotateCcw },
  { to: '/finance/pending', label: 'Pending', icon: Bell },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/procurement', label: 'Procurement', icon: ShoppingCart },
  { to: '/vendors', label: 'Vendors', icon: Truck },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/website', label: 'Website', icon: Globe },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <h1>Zar-E-Fishan</h1>
        <p>Interior Design ERP</p>
      </div>
      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
