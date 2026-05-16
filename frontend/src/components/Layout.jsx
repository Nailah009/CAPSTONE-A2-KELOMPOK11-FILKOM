import {AlertTriangle, Camera, LayoutDashboard, Shield, FileText, LogOut, Settings} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../utils/auth'

const menus = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live-camera', label: 'Live Camera', icon: Camera },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/admin', label: 'Admin', icon: Settings }
]

export default function Layout() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const roleLabel =
    user?.role === 'general_manager'
      ? 'General Manager'
      : user?.role === 'supervisor'
        ? 'Supervisor'
        : user?.role === 'admin'
          ? 'Admin'
          : 'User'

  const allowedMenus = 
    user?.role === 'admin'
      ? menus
      : user?.role === 'general_manager'
        ? menus.filter((item) => ['Dashboard', 'Reports'].includes(item.label))
        : menus.filter((item) => ['Dashboard', 'Live Camera', 'Reports'].includes(item.label))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-wrap">
            <div className="brand-icon">
              <Shield size={22} />
            </div>
            <div className="brand-name">Smart K3 Vision</div>
          </div>

          <nav className="nav-list">
            {allowedMenus.map(({ to, label, icon: Icon }, index) => (
              <NavLink
                key={`${label}-${index}`}
                to={to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="user-card">
          <div className="user-avatar">
            {(user?.name || 'U').charAt(0)}
          </div>

          <div className="user-info">
            <strong>{user?.name || 'Guest User'}</strong>
            <span>{roleLabel}</span>
          </div>

          <button
            type="button"
            className="logout-icon-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}