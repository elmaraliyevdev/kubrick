import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { render } from '@/test/utils'

const mockNavigate = vi.fn()
const mockDispatch = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock react-redux
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: vi.fn((selector) => selector({
      auth: {
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }
    })),
  }
})

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    global.fetch = vi.fn()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => render(<div>{children}</div>).container,
    })
    
    expect(result.current.token).toBe(null)
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoginLoading).toBe(false)
    expect(result.current.isRegisterLoading).toBe(false)
  })

  it('handles successful registration', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        id: 1, 
        email: 'test@example.com',
        email_verified: false 
      }),
    })
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => render(<div>{children}</div>).container,
    })
    
    result.current.register({ 
      email: 'test@example.com', 
      password: 'TestPass123' 
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'TestPass123',
          }),
        })
      )
    })
    
    await waitFor(() => {
      expect(localStorage.getItem('pendingVerificationEmail')).toBe('test@example.com')
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email')
    })
  })

  it('handles registration error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Email already registered' }),
    })
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => render(<div>{children}</div>).container,
    })
    
    result.current.register({ 
      email: 'existing@example.com', 
      password: 'TestPass123' 
    })
    
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: 'Email already registered',
        })
      )
    })
  })

  it('handles successful login', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        access_token: 'jwt-token',
        token_type: 'bearer'
      }),
    })
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => render(<div>{children}</div>).container,
    })
    
    result.current.login({ 
      email: 'test@example.com', 
      password: 'TestPass123' 
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/auth/login-password',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'TestPass123',
          }),
        })
      )
    })
    
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { token: 'jwt-token' },
        })
      )
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles successful email verification (registration flow)', async () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        access_token: 'jwt-token',
        token_type: 'bearer'
      }),
    })
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => render(<div>{children}</div>).container,
    })
    
    result.current.verifyOTP({ 
      email: 'test@example.com', 
      code: '123456' 
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/auth/verify-code',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            code: '123456',
          }),
        })
      )
    })
    
    await waitFor(() => {
      expect(localStorage.getItem('pendingVerificationEmail')).toBe(null)
      expect(mockNavigate).toHaveBeenCalledWith('/complete-profile')
    })
  })

  it('handles successful OTP verification (login flow)', async () => {
    // No pending email means this is login OTP
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        access_token: 'jwt-token',
        token_type: 'bearer'
      }),
    })
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => render(<div>{children}</div>).container,
    })
    
    result.current.verifyOTP({ 
      email: 'test@example.com', 
      code: '123456' 
    })
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles logout', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => render(<div>{children}</div>).container,
    })
    
    result.current.logout()
    
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringContaining('logout') })
    )
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})