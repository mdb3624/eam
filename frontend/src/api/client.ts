export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

export interface RequestOptions {
  method?: string
  body?: unknown
  token?: string | null
  /** Called when an authenticated request gets a 401 (token expired or revoked). */
  onUnauthorized?: () => void
}

const GENERIC_ERROR = 'Something went wrong. Try again.'
const NETWORK_ERROR = 'Could not reach the server. Try again.'

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiRequestError(0, 'NETWORK', NETWORK_ERROR)
  }

  if (response.ok) {
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  if (response.status === 401 && options.token) {
    options.onUnauthorized?.()
  }
  let code = 'UNKNOWN'
  let message = GENERIC_ERROR
  try {
    const body = (await response.json()) as { code?: string; message?: string }
    code = body.code ?? code
    message = body.message ?? message
  } catch {
    // Non-JSON error body (proxy error page, empty 401): keep the generic message.
  }
  throw new ApiRequestError(response.status, code, message)
}
