import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { ROLE_CONFIG } from '@/auth/roles'
import { applyTheme, currentTheme, type Theme } from '@/auth/theme'
import { Logo, NavIcon } from './Icons'

export default function AppShell() {
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const role = user?.role ? ROLE_CONFIG[user.role] : null

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="app">
      <aside className="side">
        <div className="logo">
          <Logo />
          <div>
            EAM
            <small>ASSET AND FIELD OPS</small>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {role && (
            <NavLink to={role.home} data-testid={`shell-nav-${role.home.slice(1)}`}>
              <NavIcon name={role.icon} />
              {role.navLabel}
            </NavLink>
          )}
        </nav>
        <div className="me">
          <span className="email" data-testid="shell-user-email">
            {user?.email}
          </span>
          <span>
            <span className="badge" data-testid="shell-role-badge">
              {role ? role.label : 'No role assigned'}
            </span>
          </span>
          <button type="button" className="btn btn-ghost" onClick={toggleTheme} data-testid="shell-theme-toggle">
            {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={logout} data-testid="shell-signout">
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="stage">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
