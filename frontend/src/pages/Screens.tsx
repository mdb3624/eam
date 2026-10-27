import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { ROLE_CONFIG, homeFor, type Role } from '@/auth/roles'

/** Placeholder body for a role home screen; each is replaced by its own story (US-009, US-014, ...). */
export function PlaceholderScreen({ role }: { role: Role }) {
  const config = ROLE_CONFIG[role]
  return (
    <section className="placeholder" data-testid={`screen-${config.home.slice(1)}`}>
      <div className="eyebrow">{config.label}</div>
      <h1>{config.navLabel}</h1>
      <p className="muted">This screen is coming in a later release.</p>
    </section>
  )
}

export function AccessDenied() {
  const { user } = useAuth()
  const home = homeFor(user?.role)
  return (
    <section className="placeholder" data-testid="access-denied">
      <h1>Access denied</h1>
      <p>You do not have access to this screen.</p>
      {home && <Link to={home}>Go to your home screen</Link>}
    </section>
  )
}

export function RequireRole({ role, children }: { role: Role; children: JSX.Element }) {
  const { user } = useAuth()
  return user?.role === role ? children : <AccessDenied />
}

export function Loading() {
  return (
    <div role="status" className="loading">
      Loading...
    </div>
  )
}
