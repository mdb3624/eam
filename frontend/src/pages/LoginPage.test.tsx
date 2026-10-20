// Story: US-001. HFD design docs/design/US-001/login-and-shell.md, section 1 (Login).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/auth/AuthContext'
import { jsonResponse, loginSuccess, mockFetch } from '@/test/mockApi'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('labels the fields and enables browser autofill', () => {
    renderLogin()

    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password')
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'username')
    expect(email).toHaveFocus()
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'current-password')
  })

  it('has no utility or tenant field', () => {
    renderLogin()

    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('disables Sign in until both fields have a value', async () => {
    renderLogin()
    const user = userEvent.setup()
    const submit = screen.getByTestId('login-submit')

    expect(submit).toBeDisabled()
    await user.type(screen.getByTestId('login-email'), 'maria@utility.com')
    expect(submit).toBeDisabled()
    await user.type(screen.getByTestId('login-password'), 'pw')
    expect(submit).toBeEnabled()
  })

  it('validates the email format on blur and links the message to the field', async () => {
    renderLogin()
    const user = userEvent.setup()
    const email = screen.getByTestId('login-email')

    await user.type(email, 'maria@')
    await user.tab()

    expect(email).toHaveAttribute('aria-invalid', 'true')
    const message = screen.getByText('Enter a valid email address.')
    expect(email.getAttribute('aria-describedby')).toBe(message.id)
  })

  it('does not call the API when the email is malformed', async () => {
    const fetchMock = mockFetch({})
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'maria@')
    await user.type(screen.getByTestId('login-password'), 'pw')

    await user.click(screen.getByTestId('login-submit'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it('shows Signing in... and blocks double submit while the request is in flight', async () => {
    let release: (r: Response) => void = () => undefined
    const fetchMock = mockFetch({
      'POST /api/v1/auth/login': () => new Promise<Response>((resolve) => { release = resolve }),
    })
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'maria@utility.com')
    await user.type(screen.getByTestId('login-password'), 'pw')

    await user.click(screen.getByTestId('login-submit'))

    expect(screen.getByTestId('login-submit')).toHaveTextContent('Signing in...')
    expect(screen.getByTestId('login-submit')).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    release(jsonResponse(200, loginSuccess('DISPATCHER')))
    expect(await screen.findByTestId('screen-dispatch')).toBeInTheDocument()
  })

  it('sends the typed credentials and trims nothing from the password', async () => {
    const fetchMock = mockFetch({
      'POST /api/v1/auth/login': () => jsonResponse(200, loginSuccess('DISPATCHER')),
    })
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'maria@utility.com')
    await user.type(screen.getByTestId('login-password'), ' pw with spaces ')

    await user.click(screen.getByTestId('login-submit'))
    await screen.findByTestId('screen-dispatch')

    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      email: 'maria@utility.com',
      password: ' pw with spaces ',
    })
  })

  it('submits with the Enter key', async () => {
    mockFetch({ 'POST /api/v1/auth/login': () => jsonResponse(200, loginSuccess('DISPATCHER')) })
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'maria@utility.com')
    await user.type(screen.getByTestId('login-password'), 'pw{Enter}')

    expect(await screen.findByTestId('screen-dispatch')).toBeInTheDocument()
  })
})
