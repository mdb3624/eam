import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiRequestError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { homeFor } from '@/auth/roles'
import { Logo, PowerLines } from '@/components/Icons'
import { Loading } from './Screens'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SESSION_EXPIRED = 'Your session expired. Sign in again.'

export default function LoginPage() {
  const { status, user, sessionExpired, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') {
    return <Loading />
  }
  if (status === 'authenticated') {
    return <Navigate to={homeFor(user?.role) ?? '/'} replace />
  }

  const emailInvalid = emailTouched && !EMAIL_PATTERN.test(email)
  const banner = error ?? (sessionExpired ? SESSION_EXPIRED : null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) {
      return
    }
    if (!EMAIL_PATTERN.test(email)) {
      setEmailTouched(true)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login">
        <div className="brandpane">
          <div className="logo">
            <Logo />
            <div>
              EAM
              <small>ASSET AND FIELD OPERATIONS</small>
            </div>
          </div>
          <div className="brand-copy">
            <h2>Know the asset. Act on the alarm.</h2>
            <p className="muted">
              One canonical record for every transformer, feeder and substation, from alarm to closed work order.
            </p>
          </div>
          <PowerLines />
        </div>
        <div className="formpane">
          <h1>Sign in</h1>
          <p className="muted sub">Use your utility email address.</p>
          {banner && (
            <div className="banner" role="alert" data-testid="login-error">
              <b>Error:</b> <span>{banner}</span>
            </div>
          )}
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                data-testid="login-email"
                type="email"
                autoComplete="username"
                placeholder="name@utility.com"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={emailInvalid || undefined}
                aria-describedby={emailInvalid ? 'login-email-error' : undefined}
              />
              {emailInvalid && (
                <div className="field-error" id="login-email-error">
                  Enter a valid email address.
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              data-testid="login-submit"
              disabled={!email || !password || submitting}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
