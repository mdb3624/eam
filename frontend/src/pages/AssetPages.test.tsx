// Story: US-002 (Canonical Asset Record and Search).
// AC 1: search by Asset ID opens the Asset 360 view with Asset ID, status, criticality and location.
// AC 2: the utility > substation > feeder > asset hierarchy is displayed.
// AC 3: a non-existent Asset ID shows "no matching asset", never a blank or error screen.
// Edge cases: blank search, asset not found, location not recorded, access denied, session expired.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/auth/AuthContext'
import { setToken } from '@/auth/session'
import { jsonResponse, mockFetch, type Role } from '@/test/mockApi'

const TX_ID = '11111111-1111-4111-8111-111111111111'
const FEEDER_ID = '22222222-2222-4222-8222-222222222222'
const SUB_ID = '33333333-3333-4333-8333-333333333333'
const TENANT_ID = '44444444-4444-4444-8444-444444444444'

const summary = {
  id: TX_ID,
  assetCode: 'TX-4587',
  name: 'Main St Transformer',
  assetType: 'TRANSFORMER',
  status: 'IN_SERVICE',
  criticality: 'HIGH',
}

const detail = {
  ...summary,
  location: { latitude: 40.7128, longitude: -74.006 },
  manufacturer: 'ABB',
  model: 'TX-200',
  serialNumber: 'SN-99812',
  hierarchy: [
    { id: TENANT_ID, assetCode: null, name: 'Metro Power', assetType: 'UTILITY' },
    { id: SUB_ID, assetCode: 'SUB-3', name: 'Substation 3', assetType: 'SUBSTATION' },
    { id: FEEDER_ID, assetCode: 'F-12', name: 'Feeder 12', assetType: 'FEEDER' },
    { id: TX_ID, assetCode: 'TX-4587', name: 'Main St Transformer', assetType: 'TRANSFORMER' },
  ],
}

function renderAt(path: string, role: Role | null = 'OPERATOR', handlers: Parameters<typeof mockFetch>[0] = {}) {
  setToken('tok-123')
  const fetchMock = mockFetch({
    'GET /api/v1/auth/me': () =>
      jsonResponse(200, { id: 'u-1', email: 'maria@utility.com', role: role ?? undefined }),
    ...handlers,
  })
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
  return fetchMock
}

async function search(text: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByTestId('asset-search-input'), text)
  await user.click(screen.getByTestId('asset-search-submit'))
  return user
}

describe('Asset pages', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('navigation', () => {
    it.each(['OPERATOR', 'DISPATCHER', 'FIELD_TECHNICIAN', 'MAINTENANCE_SUPERVISOR', 'SYSTEM_ADMIN'] as const)(
      '%s sees an Assets nav item after their home item',
      async (role) => {
        renderAt('/', role)

        const assets = await screen.findByTestId('shell-nav-assets')
        expect(assets).toHaveTextContent('Assets')
        expect(assets).toHaveAttribute('href', '/assets')
      },
    )

    it('clicking Assets opens the search page', async () => {
      renderAt('/alarms')
      const user = userEvent.setup()

      await user.click(await screen.findByTestId('shell-nav-assets'))

      expect(await screen.findByRole('heading', { level: 1, name: 'Asset search' })).toBeInTheDocument()
      expect(screen.getByTestId('shell-nav-assets')).toHaveAttribute('aria-current', 'page')
    })

    it('a user with no role has no Assets nav item', async () => {
      renderAt('/', null)

      await screen.findByTestId('access-denied')
      expect(screen.queryByTestId('shell-nav-assets')).not.toBeInTheDocument()
    })
  })

  describe('search page', () => {
    it('state:search-idle shows an empty focused field and no message', async () => {
      renderAt('/assets')

      const input = await screen.findByTestId('asset-search-input')
      expect(input).toHaveValue('')
      expect(input).toHaveFocus()
      expect(input).toHaveAttribute('autocomplete', 'off')
      expect(screen.getByLabelText('Asset ID')).toBe(input)
      expect(screen.queryByTestId('asset-search-error')).not.toBeInTheDocument()
      expect(screen.queryByTestId('asset-search-no-match')).not.toBeInTheDocument()
    })

    it('state:search-blank-blocked shows "Enter an Asset ID." and sends no request', async () => {
      const fetchMock = renderAt('/assets')
      const user = userEvent.setup()

      await user.click(await screen.findByTestId('asset-search-submit'))
      await user.type(screen.getByTestId('asset-search-input'), '   {Enter}')

      const error = await screen.findByTestId('asset-search-error')
      expect(error).toHaveTextContent('Enter an Asset ID.')
      expect(error).toHaveAttribute('role', 'alert')
      expect(screen.getByTestId('asset-search-input')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByTestId('asset-search-input')).toHaveAttribute('aria-describedby', error.id)
      expect(fetchMock).toHaveBeenCalledTimes(1) // auth/me only
    })

    it('AC 1: one match opens the Asset 360 view, sending the trimmed text', async () => {
      const fetchMock = renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=TX-4587': () => jsonResponse(200, [summary]),
        [`GET /api/v1/assets/${TX_ID}`]: () => jsonResponse(200, detail),
      })

      await search('  TX-4587  ')

      expect(await screen.findByTestId('asset-header-code')).toHaveTextContent('TX-4587')
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/assets?assetId=TX-4587', expect.anything())
    })

    it('encodes special characters in the Asset ID', async () => {
      const fetchMock = renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=A%26B%20%231': () => jsonResponse(200, []),
      })

      await search('A&B #1')

      await screen.findByTestId('asset-search-no-match')
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/assets?assetId=A%26B%20%231', expect.anything())
    })

    it('the no-match banner carries the Error: label like every error banner', async () => {
      renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=NOPE-2': () => jsonResponse(200, []),
      })

      await search('NOPE-2')

      const banner = await screen.findByTestId('asset-search-no-match')
      expect(within(banner).getByText('Error:').tagName).toBe('B')
    })

    it('an Asset ID over 50 characters is rejected in the field with its own message and no request', async () => {
      const fetchMock = renderAt('/assets')
      const user = userEvent.setup()

      await user.type(await screen.findByTestId('asset-search-input'), 'X'.repeat(51))
      await user.click(screen.getByTestId('asset-search-submit'))

      expect(await screen.findByTestId('asset-search-error')).toHaveTextContent(
        'Asset ID must be 50 characters or fewer.',
      )
      expect(fetchMock).toHaveBeenCalledTimes(1) // auth/me only
    })

    it('an Asset ID of exactly 50 characters is sent', async () => {
      const id = 'Y'.repeat(50)
      const fetchMock = renderAt('/assets', 'OPERATOR', {
        [`GET /api/v1/assets?assetId=${id}`]: () => jsonResponse(200, []),
      })

      await search(id)

      await screen.findByTestId('asset-search-no-match')
      expect(fetchMock).toHaveBeenCalledWith(`/api/v1/assets?assetId=${id}`, expect.anything())
    })

    it('AC 3 / state:search-no-match: shows the no-match banner and keeps the page', async () => {
      renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=NOPE-1': () => jsonResponse(200, []),
      })

      await search('NOPE-1')

      const banner = await screen.findByTestId('asset-search-no-match')
      expect(banner).toHaveTextContent('No matching asset for "NOPE-1". Check the Asset ID and try again.')
      expect(banner).toHaveAttribute('role', 'alert')
      expect(screen.getByTestId('asset-search-input')).toBeInTheDocument()
    })

    it('shows Searching... and makes the field read-only while the request is in flight', async () => {
      let release: (r: Response) => void = () => undefined
      renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=SLOW-1': () => new Promise<Response>((resolve) => (release = resolve)),
      })

      await search('SLOW-1')

      expect(await screen.findByRole('button', { name: 'Searching...' })).toBeInTheDocument()
      expect(screen.getByTestId('asset-search-input')).toHaveAttribute('readonly')
      release(jsonResponse(200, []))
      await screen.findByTestId('asset-search-no-match')
      expect(screen.getByTestId('asset-search-submit')).toHaveTextContent('Search')
      expect(screen.getByTestId('asset-search-input')).not.toHaveAttribute('readonly')
    })

    it('a failed search shows the shared error message in an alert', async () => {
      renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=BOOM-1': () => jsonResponse(500, {}),
      })

      await search('BOOM-1')

      expect(await screen.findByTestId('asset-search-error')).toHaveTextContent('Something went wrong. Try again.')
    })

    it('a network failure shows the could-not-reach message', async () => {
      renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=NET-1': () => Promise.reject(new TypeError('offline')),
      })

      await search('NET-1')

      expect(await screen.findByTestId('asset-search-error')).toHaveTextContent('Could not reach the server. Try again.')
    })

    it('a new search clears the previous message', async () => {
      renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=A': () => jsonResponse(200, []),
      })
      const user = await search('A')
      await screen.findByTestId('asset-search-no-match')

      await user.clear(screen.getByTestId('asset-search-input'))
      await user.click(screen.getByTestId('asset-search-submit'))

      expect(screen.queryByTestId('asset-search-no-match')).not.toBeInTheDocument()
      expect(await screen.findByTestId('asset-search-error')).toHaveTextContent('Enter an Asset ID.')
    })

    it('state:access-denied: a user with no role sees Access denied on /assets', async () => {
      renderAt('/assets', null)

      expect(await screen.findByTestId('access-denied')).toBeInTheDocument()
      expect(screen.queryByTestId('asset-search-input')).not.toBeInTheDocument()
    })

    it('state:session-expired: a 401 returns the user to login with the expired message', async () => {
      renderAt('/assets', 'OPERATOR', {
        'GET /api/v1/assets?assetId=TX-4587': () => jsonResponse(401, {}),
      })

      await search('TX-4587')

      expect(await screen.findByTestId('login-error')).toHaveTextContent('Your session expired. Sign in again.')
    })
  })

  describe('Asset 360', () => {
    function renderAsset(overrides: Partial<typeof detail> = {}) {
      return renderAt(`/assets/${TX_ID}`, 'OPERATOR', {
        [`GET /api/v1/assets/${TX_ID}`]: () => jsonResponse(200, { ...detail, ...overrides }),
      })
    }

    it('AC 1 / state:asset-loaded: the header shows Asset ID, name, status, criticality and location', async () => {
      renderAsset()

      expect(await screen.findByRole('heading', { level: 1, name: 'TX-4587' })).toBeInTheDocument()
      expect(screen.getByTestId('asset-header-name')).toHaveTextContent('Main St Transformer')
      expect(screen.getByTestId('asset-status')).toHaveTextContent('In service')
      expect(screen.getByTestId('asset-criticality')).toHaveTextContent('High')
      expect(screen.getByTestId('asset-location')).toHaveTextContent('40.71280, -74.00600')
      expect(screen.getByTestId('asset-manufacturer')).toHaveTextContent('ABB')
      expect(screen.getByTestId('asset-model')).toHaveTextContent('TX-200')
      expect(screen.getByTestId('asset-serial')).toHaveTextContent('SN-99812')
    })

    it('shows a loading indicator until the asset arrives', async () => {
      renderAt(`/assets/${TX_ID}`, 'OPERATOR', {
        [`GET /api/v1/assets/${TX_ID}`]: () => new Promise<Response>(() => undefined),
      })

      expect(await screen.findByRole('status')).toHaveTextContent('Loading...')
    })

    it.each([
      ['IN_SERVICE', 'In service'],
      ['OUT_OF_SERVICE', 'Out of service'],
      ['RETIRED', 'Retired'],
    ])('status %s is shown as the word "%s"', async (status, word) => {
      renderAsset({ status })

      expect(await screen.findByTestId('asset-status')).toHaveTextContent(word)
    })

    it.each([
      ['LOW', 'Low'],
      ['MEDIUM', 'Medium'],
      ['HIGH', 'High'],
      ['CRITICAL', 'Critical'],
    ])('criticality %s is shown as the word "%s"', async (criticality, word) => {
      renderAsset({ criticality })

      expect(await screen.findByTestId('asset-criticality')).toHaveTextContent(word)
    })

    it('AC 2: the hierarchy runs utility, substation, feeder, asset with the current asset last', async () => {
      renderAsset()

      const nav = await screen.findByRole('navigation', { name: 'Asset hierarchy' })
      const items = within(nav).getAllByTestId('asset-hierarchy-item')
      expect(items).toHaveLength(4)
      expect(items[0]).toHaveTextContent('UtilityMetro Power')
      expect(items[1]).toHaveTextContent('SubstationSUB-3')
      expect(items[2]).toHaveTextContent('FeederF-12')
      expect(items[3]).toHaveTextContent('TransformerTX-4587')
      expect(items[3]).toHaveAttribute('aria-current', 'page')
      expect(within(items[3]).queryByRole('link')).not.toBeInTheDocument()
      expect(within(items[0]).queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByTestId('asset-hierarchy-link-substation')).toHaveAttribute('href', `/assets/${SUB_ID}`)
      expect(screen.getByTestId('asset-hierarchy-link-feeder')).toHaveAttribute('href', `/assets/${FEEDER_ID}`)
    })

    it('state:location-not-recorded and missing details show "Not recorded", never blank', async () => {
      renderAsset({ location: null, manufacturer: null, model: null, serialNumber: null } as never)

      expect(await screen.findByTestId('asset-location')).toHaveTextContent('Not recorded')
      expect(screen.getByTestId('asset-manufacturer')).toHaveTextContent('Not recorded')
      expect(screen.getByTestId('asset-model')).toHaveTextContent('Not recorded')
      expect(screen.getByTestId('asset-serial')).toHaveTextContent('Not recorded')
    })

    it('the back link returns to the search page', async () => {
      renderAsset()
      const user = userEvent.setup()

      await user.click(await screen.findByTestId('asset-back-link'))

      expect(await screen.findByTestId('asset-search-input')).toBeInTheDocument()
    })

    it('state:asset-not-found: a 404 shows the not-found card with a way back', async () => {
      renderAt(`/assets/${TX_ID}`, 'OPERATOR', {
        [`GET /api/v1/assets/${TX_ID}`]: () => jsonResponse(404, { code: 'ASSET_NOT_FOUND', message: 'No matching asset.' }),
      })

      const card = await screen.findByTestId('asset-not-found')
      expect(card).toHaveTextContent('Asset not found')
      expect(card).toHaveTextContent('No matching asset.')
      expect(within(card).getByTestId('asset-not-found-back')).toHaveAttribute('href', '/assets')
    })

    it('a malformed id (400) is shown as not found too', async () => {
      renderAt('/assets/not-a-uuid', 'OPERATOR', {
        'GET /api/v1/assets/not-a-uuid': () => jsonResponse(400, { code: 'VALIDATION_ERROR', message: 'Enter a valid Asset ID.' }),
      })

      expect(await screen.findByTestId('asset-not-found')).toBeInTheDocument()
    })

    it('an unexpected failure shows the shared error text in an alert', async () => {
      renderAt(`/assets/${TX_ID}`, 'OPERATOR', {
        [`GET /api/v1/assets/${TX_ID}`]: () => jsonResponse(500, {}),
      })

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Something went wrong. Try again.')
      expect(screen.queryByTestId('asset-not-found')).not.toBeInTheDocument()
    })

    it('state:access-denied: a user with no role sees Access denied and no request is made', async () => {
      const fetchMock = renderAt(`/assets/${TX_ID}`, null)

      expect(await screen.findByTestId('access-denied')).toBeInTheDocument()
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    })

    it('state:session-expired: a 401 returns the user to login', async () => {
      renderAt(`/assets/${TX_ID}`, 'OPERATOR', {
        [`GET /api/v1/assets/${TX_ID}`]: () => jsonResponse(401, {}),
      })

      expect(await screen.findByTestId('login-error')).toHaveTextContent('Your session expired. Sign in again.')
    })

    it('opening a different asset from the hierarchy loads that asset', async () => {
      renderAt(`/assets/${TX_ID}`, 'OPERATOR', {
        [`GET /api/v1/assets/${TX_ID}`]: () => jsonResponse(200, detail),
        [`GET /api/v1/assets/${SUB_ID}`]: () =>
          jsonResponse(200, {
            ...detail,
            id: SUB_ID,
            assetCode: 'SUB-3',
            name: 'Substation 3',
            assetType: 'SUBSTATION',
            hierarchy: detail.hierarchy.slice(0, 2),
          }),
      })
      const user = userEvent.setup()

      await user.click(await screen.findByTestId('asset-hierarchy-link-substation'))

      expect(await screen.findByRole('heading', { level: 1, name: 'SUB-3' })).toBeInTheDocument()
    })
  })
})
