import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'

function installLocalStoragePolyfill() {
  if (typeof globalThis.localStorage?.getItem === 'function') return

  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    },
  })
}

installLocalStoragePolyfill()

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

let server: Awaited<typeof import('./mocks/server')>['server']

// Start MSW server for API mocking
beforeAll(async () => {
  server = (await import('./mocks/server')).server
  server.listen()
})

// Clean up after each test
afterEach(() => {
  server.resetHandlers()
  // Clear localStorage
  localStorage.clear()
})

// Clean up after all tests are done
afterAll(() => server.close())
