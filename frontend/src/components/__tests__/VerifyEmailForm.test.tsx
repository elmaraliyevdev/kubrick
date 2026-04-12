import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { VerifyEmailForm } from '../VerifyEmailForm'

const mockNavigate = vi.fn()
const authMock = vi.hoisted(() => ({
  requestOTP: vi.fn(),
  verifyOTP: vi.fn(),
  isOTPLoading: false,
  error: null as string | null,
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authMock,
}))

describe('VerifyEmailForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    authMock.requestOTP.mockReset()
    authMock.verifyOTP.mockReset()
    authMock.isOTPLoading = false
    authMock.error = null
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
    
    expect(authMock.verifyOTP).toHaveBeenCalledWith({
      email: 'test@example.com',
      code: '123456',
    })
  })

  it('shows error message', () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    
    authMock.error = 'Invalid code'
    
    render(<VerifyEmailForm />)
    
    expect(screen.getByText(/invalid code/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    
    authMock.isOTPLoading = true
    
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
      `${import.meta.env.VITE_API_URL}/auth/resend-verification`,
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
