import { describe, it, expect, beforeEach } from 'vitest'
import authReducer, { 
  loginSuccess, 
  logout, 
  setError, 
  setLoading,
  setUser,
  clearError 
} from '../authSlice'

describe('authSlice', () => {
  const initialState = {
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle setLoading', () => {
    const state = authReducer(initialState, setLoading(true))
    
    expect(state.isLoading).toBe(true)
  })

  it('should handle setError', () => {
    const errorMessage = 'Login failed'
    const state = authReducer(initialState, setError(errorMessage))
    
    expect(state.error).toBe(errorMessage)
  })

  it('should handle clearError', () => {
    const stateWithError = {
      ...initialState,
      error: 'Some error'
    }
    
    const state = authReducer(stateWithError, clearError())
    
    expect(state.error).toBe(null)
  })

  it('should handle loginSuccess', () => {
    const token = 'jwt-token'
    const user = {
      id: 1,
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      organization_id: 1
    }
    
    const state = authReducer(initialState, loginSuccess({ token, user }))
    
    expect(state.token).toBe(token)
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe(null)
    expect(localStorage.getItem('token')).toBe(token)
  })

  it('should handle loginSuccess without user', () => {
    const token = 'jwt-token'
    
    const state = authReducer(initialState, loginSuccess({ token }))
    
    expect(state.token).toBe(token)
    expect(state.user).toBe(null)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should handle setUser', () => {
    const user = {
      id: 1,
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      organization_id: 1
    }
    
    const state = authReducer(initialState, setUser(user))
    
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should handle logout', () => {
    const loggedInState = {
      token: 'jwt-token',
      user: {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        organization_id: 1
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }
    
    localStorage.setItem('token', 'jwt-token')
    
    const state = authReducer(loggedInState, logout())
    
    expect(state).toEqual(initialState)
    expect(localStorage.getItem('token')).toBe(null)
  })

  it('should read token from localStorage in initial state', () => {
    localStorage.setItem('token', 'stored-token')
    
    // Re-import to get fresh initial state
    const { default: freshAuthReducer } = await import('../authSlice')
    const state = freshAuthReducer(undefined, { type: 'unknown' })
    
    expect(state.token).toBe('stored-token')
  })
})