import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Newer Node versions ship an experimental global localStorage that can shadow jsdom's and be
// unusable without a backing file. Fall back to an in-memory Storage so tests behave the same everywhere.
function installMemoryStorage(name: 'localStorage' | 'sessionStorage') {
  const current = (globalThis as Record<string, unknown>)[name] as Storage | undefined
  if (current && typeof current.clear === 'function') {
    return
  }
  const data = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, name, { value: storage, configurable: true })
  Object.defineProperty(window, name, { value: storage, configurable: true })
}

installMemoryStorage('localStorage')
installMemoryStorage('sessionStorage')

afterEach(() => {
  cleanup()
})
