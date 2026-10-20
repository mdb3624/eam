import { vi } from 'vitest'

export type Role =
  | 'OPERATOR'
  | 'DISPATCHER'
  | 'FIELD_TECHNICIAN'
  | 'MAINTENANCE_SUPERVISOR'
  | 'SYSTEM_ADMIN'

export function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function loginSuccess(role: Role | null, email = 'maria@utility.com') {
  return {
    accessToken: 'tok-123',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: 'u-1', email, role: role ?? undefined },
  }
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

/** Replaces global fetch. Unmatched requests fail loudly so a missing handler is never silent. */
export function mockFetch(handlers: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${url}`
    const handler = handlers[key]
    if (!handler) {
      throw new Error(`Unexpected request: ${key}`)
    }
    return handler(url, init)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}
