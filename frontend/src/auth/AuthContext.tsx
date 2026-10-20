import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiRequestError, apiRequest, type RequestOptions } from '@/api/client'
import { clearToken, getToken, setToken } from './session'
import { isRole, type Role } from './roles'

export interface User {
  id: string
  email: string
  role: Role | null
}

type Status = 'loading' | 'anonymous' | 'authenticated'

interface RawUser {
  id: string
  email: string
  role?: string | null
}

interface LoginResponse {
  accessToken: string
  user: RawUser
}

interface AuthContextValue {
  status: Status
  user: User | null
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  request: <T>(path: string, options?: Omit<RequestOptions, 'token' | 'onUnauthorized'>) => Promise<T>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toUser(raw: RawUser): User {
  return { id: raw.id, email: raw.email, role: isRole(raw.role) ? raw.role : null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(() => (getToken() ? 'loading' : 'anonymous'))
  const [user, setUser] = useState<User | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const expire = useCallback(() => {
    clearToken()
    setUser(null)
    setStatus('anonymous')
    setSessionExpired(true)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      return
    }
    let cancelled = false
    apiRequest<RawUser>('/api/v1/auth/me', { token })
      .then((me) => {
        if (!cancelled) {
          setUser(toUser(me))
          setStatus('authenticated')
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof ApiRequestError && error.status === 401) {
          expire()
        } else {
          setStatus('anonymous')
        }
      })
    return () => {
      cancelled = true
    }
  }, [expire])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(response.accessToken)
    setUser(toUser(response.user))
    setSessionExpired(false)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setSessionExpired(false)
    setStatus('anonymous')
  }, [])

  const request = useCallback(
    <T,>(path: string, options: Omit<RequestOptions, 'token' | 'onUnauthorized'> = {}) =>
      apiRequest<T>(path, { ...options, token: getToken(), onUnauthorized: expire }),
    [expire],
  )

  const value = useMemo(
    () => ({ status, user, sessionExpired, login, logout, request }),
    [status, user, sessionExpired, login, logout, request],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
