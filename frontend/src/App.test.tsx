// Story: US-001 (User Login and Role-Based Access).
// AC 1: login lands on the role home with only that role's navigation.
// AC 2: invalid credentials are rejected and no session is created.
// AC 3: a user without a role cannot open role-gated screens.
// Edge cases: disabled account message, session expiry.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { jsonResponse, loginSuccess, mockFetch, type Role } from './test/mockApi'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function signIn(email = 'maria@utility.com', password = 'pw-12345') {
  const user = userEvent.setup()
  await user.type(screen.getByTestId('login-email'), email)
  await user.type(screen.getByTestId('login-password'), password)
  await user.click(screen.getByTestId('login-submit'))
  return user
}

function loginAs(role: Role | null) {
  return mockFetch({ 'POST /api/v1/auth/login': () => jsonResponse(200, loginSuccess(role)) })
}

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('AC 1: successful login routes to the role home', () => {
    it('dispatcher lands on the Dispatch board and sees only their navigation', async () => {
      loginAs('DISPATCHER')
      renderApp('/login')

      await signIn()

      expect(await screen.findByTestId('screen-dispatch')).toBeInTheDocument()
      expect(screen.getByTestId('shell-nav-dispatch')).toHaveAttribute('aria-current', 'page')
      expect(screen.queryByTestId('shell-nav-alarms')).not.toBeInTheDocument()
      expect(screen.queryByTestId('shell-nav-work')).not.toBeInTheDocument()
      expect(screen.getByTestId('shell-role-badge')).toHaveTextContent('Dispatcher')
      expect(screen.getByTestId('shell-user-email')).toHaveTextContent('maria@utility.com')
    })

    it.each([
      ['OPERATOR', 'alarms', 'Control-Center Operator'],
      ['FIELD_TECHNICIAN', 'work', 'Field Technician'],
      ['MAINTENANCE_SUPERVISOR', 'closure', 'Maintenance Supervisor'],
      ['SYSTEM_ADMIN', 'admin', 'System Administrator'],
    ] as const)('%s lands on /%s', async (role, route, label) => {
      loginAs(role)
      renderApp('/login')

      await signIn()

      expect(await screen.findByTestId(`screen-${route}`)).toBeInTheDocument()
      expect(screen.getByTestId('shell-role-badge')).toHaveTextContent(label)
    })

    it('stores the token for the session and sends it on later requests', async () => {
      const fetchMock = mockFetch({
        'POST /api/v1/auth/login': () => jsonResponse(200, loginSuccess('DISPATCHER')),
      })
      renderApp('/login')

      await signIn()
      await screen.findByTestId('screen-dispatch')

      expect(sessionStorage.getItem('eam.token')).toBe('tok-123')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('redirects an authenticated user away from the login page', async () => {
      loginAs('DISPATCHER')
      const { unmount } = renderApp('/login')
      await signIn()
      await screen.findByTestId('screen-dispatch')
      unmount()

      mockFetch({
        'GET /api/v1/auth/me': () => jsonResponse(200, loginSuccess('DISPATCHER').user),
      })
      renderApp('/login')

      expect(await screen.findByTestId('screen-dispatch')).toBeInTheDocument()
    })

    it('sends / to the role home when signed in and to /login when not', async () => {
      renderApp('/')
      expect(await screen.findByTestId('login-submit')).toBeInTheDocument()
    })
  })

  describe('AC 2: invalid credentials', () => {
    it('shows the API message, stays on login and creates no session', async () => {
      mockFetch({
        'POST /api/v1/auth/login': () =>
          jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }),
      })
      renderApp('/login')

      await signIn()

      expect(await screen.findByTestId('login-error')).toHaveTextContent('Invalid email or password.')
      expect(screen.getByTestId('login-error')).toHaveAttribute('role', 'alert')
      expect(screen.getByTestId('login-submit')).toBeInTheDocument()
      expect(sessionStorage.getItem('eam.token')).toBeNull()
    })

    it('shows a different message for a disabled account', async () => {
      mockFetch({
        'POST /api/v1/auth/login': () =>
          jsonResponse(403, { code: 'ACCOUNT_DISABLED', message: 'This account is disabled. Contact your administrator.' }),
      })
      renderApp('/login')

      await signIn()

      expect(await screen.findByTestId('login-error')).toHaveTextContent('This account is disabled. Contact your administrator.')
      expect(sessionStorage.getItem('eam.token')).toBeNull()
    })

    it('tells the user when the server cannot be reached', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
      renderApp('/login')

      await signIn()

      expect(await screen.findByTestId('login-error')).toHaveTextContent('Could not reach the server. Try again.')
    })

    it('clears the previous error when the user submits again', async () => {
      let attempt = 0
      mockFetch({
        'POST /api/v1/auth/login': () => {
          attempt += 1
          return attempt === 1
            ? jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' })
            : jsonResponse(200, loginSuccess('DISPATCHER'))
        },
      })
      renderApp('/login')
      const user = await signIn()
      await screen.findByTestId('login-error')

      await user.click(screen.getByTestId('login-submit'))

      expect(await screen.findByTestId('screen-dispatch')).toBeInTheDocument()
      expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
    })
  })

  describe('AC 3: role gating', () => {
    it('denies a deep link to another role screen', async () => {
      mockFetch({ 'GET /api/v1/auth/me': () => jsonResponse(200, loginSuccess('OPERATOR').user) })
      sessionStorage.setItem('eam.token', 'tok-123')
      renderApp('/dispatch')

      expect(await screen.findByTestId('access-denied')).toHaveTextContent('You do not have access to this screen.')
      expect(screen.getByTestId('shell-nav-alarms')).toBeInTheDocument()
      expect(screen.queryByTestId('shell-nav-dispatch')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Go to your home screen' })).toHaveAttribute('href', '/alarms')
    })

    it('a user with no role sees no navigation, a no-role badge and access denied everywhere', async () => {
      mockFetch({ 'GET /api/v1/auth/me': () => jsonResponse(200, loginSuccess(null).user) })
      sessionStorage.setItem('eam.token', 'tok-123')
      renderApp('/dispatch')

      expect(await screen.findByTestId('access-denied')).toBeInTheDocument()
      expect(screen.getByTestId('shell-role-badge')).toHaveTextContent('No role assigned')
      expect(screen.queryByRole('navigation')?.querySelectorAll('a')).toHaveLength(0)
      expect(screen.queryByRole('link', { name: 'Go to your home screen' })).not.toBeInTheDocument()
    })

    it('a user with no role who logs in is told access is denied instead of landing on a screen', async () => {
      loginAs(null)
      renderApp('/login')

      await signIn()

      expect(await screen.findByTestId('access-denied')).toBeInTheDocument()
    })

    it('unknown routes for a signed-in user show access denied rather than a blank page', async () => {
      mockFetch({ 'GET /api/v1/auth/me': () => jsonResponse(200, loginSuccess('DISPATCHER').user) })
      sessionStorage.setItem('eam.token', 'tok-123')
      renderApp('/nowhere')

      expect(await screen.findByTestId('access-denied')).toBeInTheDocument()
    })

    it('an anonymous visitor to a gated route is sent to login', async () => {
      renderApp('/dispatch')

      expect(await screen.findByTestId('login-submit')).toBeInTheDocument()
    })
  })

  describe('session handling', () => {
    it('signing out clears the token and returns to login', async () => {
      loginAs('DISPATCHER')
      renderApp('/login')
      const user = await signIn()
      await screen.findByTestId('screen-dispatch')

      await user.click(screen.getByTestId('shell-signout'))

      expect(await screen.findByTestId('login-submit')).toBeInTheDocument()
      expect(sessionStorage.getItem('eam.token')).toBeNull()
    })

    it('an expired stored token sends the user to login with the session-expired message', async () => {
      mockFetch({ 'GET /api/v1/auth/me': () => jsonResponse(401) })
      sessionStorage.setItem('eam.token', 'stale')
      renderApp('/dispatch')

      expect(await screen.findByTestId('login-error')).toHaveTextContent('Your session expired. Sign in again.')
      expect(sessionStorage.getItem('eam.token')).toBeNull()
    })

    it('shows nothing interactive while the stored session is being verified', async () => {
      let release: (r: Response) => void = () => undefined
      mockFetch({ 'GET /api/v1/auth/me': () => new Promise<Response>((resolve) => { release = resolve }) })
      sessionStorage.setItem('eam.token', 'tok-123')
      renderApp('/dispatch')

      expect(screen.getByRole('status')).toHaveTextContent('Loading')
      expect(screen.queryByTestId('login-submit')).not.toBeInTheDocument()
      release(jsonResponse(200, loginSuccess('DISPATCHER').user))
      await waitFor(() => expect(screen.getByTestId('screen-dispatch')).toBeInTheDocument())
    })
  })

  describe('theme', () => {
    it('defaults to dark and toggles to light, remembering the choice', async () => {
      mockFetch({ 'GET /api/v1/auth/me': () => jsonResponse(200, loginSuccess('DISPATCHER').user) })
      sessionStorage.setItem('eam.token', 'tok-123')
      renderApp('/dispatch')
      await screen.findByTestId('screen-dispatch')
      expect(document.documentElement.dataset.theme).toBe('dark')

      await userEvent.setup().click(screen.getByTestId('shell-theme-toggle'))

      expect(document.documentElement.dataset.theme).toBe('light')
      expect(localStorage.getItem('eam.theme')).toBe('light')
    })
  })
})
