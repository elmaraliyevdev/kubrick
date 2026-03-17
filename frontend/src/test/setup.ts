import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

// Start MSW server for API mocking
beforeAll(() => server.listen())

// Clean up after each test
afterEach(() => {
  server.resetHandlers()
  // Clear localStorage
  localStorage.clear()
})

// Clean up after all tests are done
afterAll(() => server.close())