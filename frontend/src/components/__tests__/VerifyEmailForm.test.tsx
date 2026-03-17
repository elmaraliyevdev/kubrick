import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { VerifyEmailForm } from '../VerifyEmailForm'

const mockNavigate = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useAuth hook
const mockVerifyOTP = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    verifyOTP: mockVerifyOTP,
    isOTPLoading: false,
    error: null,
  }),
}))

describe('VerifyEmailForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('redirects to register if no pending email', () => {
    render(<VerifyEmailForm />)
    
    expect(mockNavigate).toHaveBeenCalledWith('/register')
  })

  it('renders with pending email from localStorage', () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    
    render(<VerifyEmailForm />)
    
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/email sent/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
  })

  it('submits verification code', async () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    const user = userEvent.setup()
    
    render(<VerifyEmailForm />)
    
    const codeInput = screen.getByLabelText(/verification code/i)
    const submitButton = screen.getByRole('button', { name: /verify email/i })
    
    await user.type(codeInput, '123456')
    await user.click(submitButton)
    
    expect(mockVerifyOTP).toHaveBeenCalledWith({
      email: 'test@example.com',
      code: '123456',
    })
  })

  it('shows error message', () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    
    vi.mocked(vi.importMock('@/hooks/useAuth')).useAuth.mockReturnValue({
      verifyOTP: mockVerifyOTP,
      isOTPLoading: false,
      error: 'Invalid code',
    })
    
    render(<VerifyEmailForm />)
    
    expect(screen.getByText(/invalid code/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    
    vi.mocked(vi.importMock('@/hooks/useAuth')).useAuth.mockReturnValue({
      verifyOTP: mockVerifyOTP,
      isOTPLoading: true,
      error: null,
    })
    
    render(<VerifyEmailForm />)
    
    expect(screen.getByText(/verifying/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled()
  })

  it('allows resending code', async () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    
    // Mock fetch for resend
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Code sent' }),
    })
    
    const user = userEvent.setup()
    render(<VerifyEmailForm />)
    
    const resendButton = screen.getByRole('button', { name: /resend code/i })
    await user.click(resendButton)
    
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/resend-verification',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    )
  })

  it('navigates back to register', async () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    const user = userEvent.setup()
    
    render(<VerifyEmailForm />)
    
    const backButton = screen.getByRole('button', { name: /back to registration/i })
    await user.click(backButton)
    
    expect(mockNavigate).toHaveBeenCalledWith('/register')
    expect(localStorage.getItem('pendingVerificationEmail')).toBeNull()
  })
})