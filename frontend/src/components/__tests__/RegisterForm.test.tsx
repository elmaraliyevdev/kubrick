import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { RegisterForm } from '../RegisterForm'

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    register: vi.fn(),
    isRegisterLoading: false,
    error: null,
  }),
}))

describe('RegisterForm', () => {
  it('renders all form fields', () => {
    render(<RegisterForm />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('shows validation errors for invalid input', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /register/i })
    
    // Try to submit with invalid email
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, '123') // too short
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      expect(screen.getByText(/password must be at least/i)).toBeInTheDocument()
    })
  })

  it('calls register function with correct data on valid submit', async () => {
    const mockRegister = vi.fn()
    
    vi.mocked(vi.importMock('@/hooks/useAuth')).useAuth.mockReturnValue({
      register: mockRegister,
      isRegisterLoading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    render(<RegisterForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /register/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'ValidPass123!')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
      })
    })
  })

  it('shows loading state when submitting', () => {
    vi.mocked(vi.importMock('@/hooks/useAuth')).useAuth.mockReturnValue({
      register: vi.fn(),
      isRegisterLoading: true,
      error: null,
    })
    
    render(<RegisterForm />)
    
    expect(screen.getByText(/registering/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('displays error message when registration fails', () => {
    vi.mocked(vi.importMock('@/hooks/useAuth')).useAuth.mockReturnValue({
      register: vi.fn(),
      isRegisterLoading: false,
      error: 'Email already registered',
    })
    
    render(<RegisterForm />)
    
    expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
  })
})