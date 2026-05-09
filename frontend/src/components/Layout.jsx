import { AlertTriangle, Camera, LayoutDashboard, Settings, Shield, FileText } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const menus = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live-camera', label: 'Live Camera', icon: Camera },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/dashboard', label: 'Analytics', icon: AlertTriangle },
  { to: '/dashboard', label: 'Settings', icon: Settings }
]

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-wrap">
            <div className="brand-icon"><Shield size={22} /></div>
            <div className="brand-name">Smart K3 Vision</div>
          </div>

          <nav className="nav-list">
            {menus.map(({ to, label, icon: Icon }, index) => (
              <NavLink
                key={`${label}-${index}`}
                to={to}
                className={({ isActive }) =>
                  `nav-item ${isActive && (label === 'Dashboard' || label === 'Reports' || label === 'Live Camera') ? 'active' : ''}`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="profile-card">
          <img
            className="avatar"
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60"
            alt="Supervisor"
          />
          <div>
            <div className="profile-name">Wahyu Hidayat</div>
            <div className="profile-role">Supervisor</div>
          </div>
          <div className="online-dot" />
        </div>
      </aside>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
