import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { ROLES, ROLE_CONFIG, homeFor } from '@/auth/roles'
import { applyTheme, getStoredTheme } from '@/auth/theme'
import AppShell from '@/components/AppShell'
import LoginPage from '@/pages/LoginPage'
import { AccessDenied, Loading, PlaceholderScreen, RequireRole } from '@/pages/Screens'

function ProtectedLayout() {
  const { status } = useAuth()
  if (status === 'loading') {
    return <Loading />
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }
  return <AppShell />
}

function HomeRedirect() {
  const { user } = useAuth()
  const home = homeFor(user?.role)
  return home ? <Navigate to={home} replace /> : <AccessDenied />
}

export default function App() {
  useEffect(() => {
    applyTheme(getStoredTheme())
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<HomeRedirect />} />
        {ROLES.map((role) => (
          <Route
            key={role}
            path={ROLE_CONFIG[role].home}
            element={
              <RequireRole role={role}>
                <PlaceholderScreen role={role} />
              </RequireRole>
            }
          />
        ))}
        <Route path="*" element={<AccessDenied />} />
      </Route>
    </Routes>
  )
}
