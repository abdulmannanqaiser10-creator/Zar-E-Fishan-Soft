import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  TrendingUp,
  Scale,
  LineChart,
  Globe,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

const NAV = [
  { type: 'link', to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  {
    type: 'group',
    id: 'crm',
    label: 'CRM',
    icon: Contact,
    children: [
      { to: '/crm', label: 'Pipeline', icon: Contact },
      { to: '/clients', label: 'Clients', icon: Users },
    ],
  },
  { type: 'link', to: '/projects', label: 'Projects', icon: FolderKanban },
  {
    type: 'group',
    id: 'finance',
    label: 'Finance',
    icon: Wallet,
    children: [
      { to: '/finance', label: 'Overview', icon: Wallet },
      { to: '/finance/invoices', label: 'Invoices', icon: FileText },
      { to: '/finance/quotations', label: 'Quotations', icon: FileSpreadsheet },
      { to: '/finance/accounts', label: 'Cash & Bank', icon: Landmark },
      { to: '/finance/expenses', label: 'Expenses', icon: Receipt },
      { to: '/finance/ledger', label: 'Ledger', icon: BookOpen },
      { to: '/finance/returns', label: 'Sales Returns', icon: RotateCcw },
      { to: '/finance/pending', label: 'Pending', icon: Bell },
    ],
  },
  {
    type: 'group',
    id: 'ops',
    label: 'Operations',
    icon: Package,
    children: [
      { to: '/inventory', label: 'Inventory', icon: Package },
      { to: '/procurement', label: 'Procurement', icon: ShoppingCart },
      { to: '/vendors', label: 'Vendors', icon: Truck },
    ],
  },
  {
    type: 'group',
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    children: [
      { to: '/reports', label: 'All Reports', icon: BarChart3 },
      { to: '/reports?type=cashFlow', label: 'Cash Flow', icon: LineChart },
      { to: '/reports?type=profitLoss', label: 'Profit & Loss', icon: TrendingUp },
      { to: '/reports?type=balanceSheet', label: 'Balance Sheet', icon: Scale },
    ],
  },
  { type: 'link', to: '/website', label: 'Website', icon: Globe },
  { type: 'link', to: '/settings', label: 'Settings', icon: Settings },
]

function pathMatches(pathname, search, to) {
  const [path, query] = to.split('?')
  if (query) {
    const params = new URLSearchParams(query)
    const current = new URLSearchParams(search)
    if (pathname !== path) return false
    return [...params.entries()].every(([k, v]) => current.get(k) === v)
  }
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState({ crm: true, finance: true, ops: false, reports: false })

  const activeGroupIds = useMemo(() => {
    const ids = []
    NAV.forEach((item) => {
      if (item.type !== 'group') return
      if (item.children.some((c) => pathMatches(location.pathname, location.search, c.to))) {
        ids.push(item.id)
      }
    })
    return ids
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!activeGroupIds.length) return
    setOpenGroups((prev) => {
      const next = { ...prev }
      activeGroupIds.forEach((id) => {
        next[id] = true
      })
      return next
    })
  }, [activeGroupIds])

  const toggleGroup = (id) => {
    if (collapsed) {
      onToggleCollapse?.(false)
      setOpenGroups((prev) => ({ ...prev, [id]: true }))
      return
    }
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">ZE</div>
        {!collapsed && (
          <div className="brand-copy">
            <h1>Zar-E-Fishan</h1>
            <p>Interior Design ERP</p>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => onToggleCollapse?.(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => {
          if (item.type === 'link') {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
                title={item.label}
              >
                <Icon size={18} className="nav-ico" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          }

          const Icon = item.icon
          const isOpen = !!openGroups[item.id]
          const groupActive = activeGroupIds.includes(item.id)

          return (
            <div key={item.id} className={`nav-group ${isOpen && !collapsed ? 'open' : ''} ${groupActive ? 'active-group' : ''}`}>
              <button
                type="button"
                className={`nav-group-btn ${groupActive ? 'active' : ''}`}
                onClick={() => toggleGroup(item.id)}
                title={item.label}
              >
                <Icon size={18} className="nav-ico" />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <ChevronDown size={14} className={`chev ${isOpen ? 'up' : ''}`} />
                  </>
                )}
              </button>
              {!collapsed && (
                <div className={`nav-sub ${isOpen ? 'show' : ''}`}>
                  <div className="nav-sub-inner">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const active = pathMatches(location.pathname, location.search, child.to)
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={`nav-link sub ${active ? 'active' : ''}`}
                          onClick={onClose}
                        >
                          <ChildIcon size={15} className="nav-ico" />
                          <span>{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <strong>Premium ERP</strong>
            <span>Projects · Finance · CRM</span>
          </div>
        </div>
      )}
    </aside>
  )
}
