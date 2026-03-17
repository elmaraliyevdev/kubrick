import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import App from '@/App'

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    // Start at register page
    window.history.pushState({}, '', '/register')
  })

  it('completes full registration and verification flow', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Step 1: Registration
    expect(screen.getByText(/create your account/i)).toBeInTheDocument()
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const registerButton = screen.getByRole('button', { name: /register/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'TestPass123!')
    await user.click(registerButton)
    
    // Step 2: Should redirect to email verification
    await waitFor(() => {
      expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
    })
    
    // Step 3: Enter verification code
    const codeInput = screen.getByLabelText(/verification code/i)
    const verifyButton = screen.getByRole('button', { name: /verify email/i })
    
    await user.type(codeInput, '123456')
    await user.click(verifyButton)
    
    // Step 4: Should redirect to complete profile
    await waitFor(() => {
      expect(screen.getByText(/complete your profile/i)).toBeInTheDocument()
    })
    
    // Step 5: Complete profile
    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    const organizationInput = screen.getByLabelText(/organization name/i)
    const saveButton = screen.getByRole('button', { name: /save & continue/i })
    
    await user.type(firstNameInput, 'John')
    await user.type(lastNameInput, 'Doe')
    await user.type(organizationInput, 'Test Corp')
    await user.click(saveButton)
    
    // Step 6: Should redirect to dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })

  it('handles registration error correctly', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const registerButton = screen.getByRole('button', { name: /register/i })
    
    // Try to register with existing email
    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'TestPass123!')
    await user.click(registerButton)
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
    
    // Should stay on registration page
    expect(screen.getByText(/create your account/i)).toBeInTheDocument()
  })

  it('handles invalid verification code', async () => {
    const user = userEvent.setup()
    
    // Set up as if we just registered
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    window.history.pushState({}, '', '/verify-email')
    
    render(<App />)
    
    const codeInput = screen.getByLabelText(/verification code/i)
    const verifyButton = screen.getByRole('button', { name: /verify email/i })
    
    await user.type(codeInput, 'invalid')
    await user.click(verifyButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument()
    })
    
    // Should stay on verification page
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
  })

  it('allows resending verification code', async () => {
    const user = userEvent.setup()
    
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    window.history.pushState({}, '', '/verify-email')
    
    render(<App />)
    
    const resendButton = screen.getByRole('button', { name: /resend code/i })
    await user.click(resendButton)
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/email sent!/i)).toBeInTheDocument()
    })
  })

  it('protects complete-profile route', async () => {
    // Try to access complete-profile without being authenticated
    window.history.pushState({}, '', '/complete-profile')
    
    render(<App />)
    
    // Should redirect to login
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
    })
  })
})

describe('Login Flow Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/login')
  })

  it('completes successful login flow', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    expect(screen.getByText(/login with password/i)).toBeInTheDocument()
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'TestPass123')
    await user.click(loginButton)
    
    // Should redirect to dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })

  it('handles login error', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrong')
    await user.click(loginButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    
    // Should stay on login page
    expect(screen.getByText(/login with password/i)).toBeInTheDocument()
  })
})