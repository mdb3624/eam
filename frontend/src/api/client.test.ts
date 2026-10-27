// Story: US-001. API client: bearer header, error mapping, 401 hook.
import { ApiRequestError, apiRequest } from './client'
import { jsonResponse, mockFetch } from '@/test/mockApi'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends JSON body and bearer token and returns parsed JSON', async () => {
    const fetchMock = mockFetch({ 'POST /api/v1/x': () => jsonResponse(200, { ok: true }) })

    const result = await apiRequest<{ ok: boolean }>('/api/v1/x', { method: 'POST', body: { a: 1 }, token: 't' })

    expect(result).toEqual({ ok: true })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBe('{"a":1}')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('omits the Authorization header without a token', async () => {
    const fetchMock = mockFetch({ 'GET /api/v1/x': () => jsonResponse(200, {}) })

    await apiRequest('/api/v1/x')

    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Authorization')
  })

  it('throws ApiRequestError carrying status, code and message from the error body', async () => {
    mockFetch({
      'GET /api/v1/x': () => jsonResponse(403, { code: 'ACCOUNT_DISABLED', message: 'This account is disabled.' }),
    })

    await expect(apiRequest('/api/v1/x')).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_DISABLED',
      message: 'This account is disabled.',
    })
  })

  it('falls back to a generic error when the body is not JSON', async () => {
    mockFetch({ 'GET /api/v1/x': () => new Response('<html>', { status: 502 }) })

    const error = (await apiRequest('/api/v1/x').catch((e) => e)) as ApiRequestError

    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error.status).toBe(502)
    expect(error.code).toBe('UNKNOWN')
  })

  it('reports a network failure as a status 0 error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))

    await expect(apiRequest('/api/v1/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK' })
  })

  it('calls onUnauthorized on a 401 for an authenticated request', async () => {
    mockFetch({ 'GET /api/v1/x': () => jsonResponse(401) })
    const onUnauthorized = vi.fn()

    await expect(apiRequest('/api/v1/x', { token: 't', onUnauthorized })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not call onUnauthorized for a 401 without a token (login failure)', async () => {
    mockFetch({ 'POST /api/v1/x': () => jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }) })
    const onUnauthorized = vi.fn()

    await expect(apiRequest('/api/v1/x', { method: 'POST', onUnauthorized })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
