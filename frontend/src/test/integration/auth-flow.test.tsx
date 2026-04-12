import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithoutRouter as render } from '@/test/utils'
import App from '@/App'

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    // Start at register page
    window.history.pushState({}, '', '/signup')
  })

  it('completes full registration and verification flow', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Step 1: Registration
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    
    const fullNameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const termsCheckbox = screen.getByRole('checkbox', { name: /i agree/i })
    const registerButton = screen.getByRole('button', { name: /create account/i })
    
    await user.type(fullNameInput, 'John Doe')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'TestPass123!')
    await user.click(termsCheckbox)
    await user.click(registerButton)
    
    // Step 2: Should redirect to email verification
    await waitFor(() => {
      expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
    })
    
    // Step 3: Enter verification code
    const codeInputs = screen.getAllByLabelText(/verification code digit/i)
    const verifyButton = screen.getByRole('button', { name: /verify/i })
    
    for (const [index, digit] of '123456'.split('').entries()) {
      await user.type(codeInputs[index], digit)
    }
    await user.click(verifyButton)
    
    // Step 4: Should redirect to complete profile
    await waitFor(() => {
      expect(screen.getByText(/complete your profile/i)).toBeInTheDocument()
    })
    
    // Step 5: Complete profile
    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    const organizationInput = screen.getByLabelText(/organization name/i)
    const saveButton = screen.getByRole('button', { name: /continue/i })
    
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
    const fullNameInput = screen.getByLabelText(/full name/i)
    const termsCheckbox = screen.getByRole('checkbox', { name: /i agree/i })
    const registerButton = screen.getByRole('button', { name: /create account/i })
    
    // Try to register with existing email
    await user.type(fullNameInput, 'Existing User')
    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'TestPass123!')
    await user.click(termsCheckbox)
    await user.click(registerButton)
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
    
    // Should stay on registration page
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
  })

  it('handles invalid verification code', async () => {
    const user = userEvent.setup()
    
    // Set up as if we just registered
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    window.history.pushState({}, '', '/verify-email')
    
    render(<App />)
    
    const codeInputs = screen.getAllByLabelText(/verification code digit/i)
    const verifyButton = screen.getByRole('button', { name: /verify/i })
    
    for (const [index, digit] of '000000'.split('').entries()) {
      await user.type(codeInputs[index], digit)
    }
    await user.click(verifyButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument()
    })
    
    // Should stay on verification page
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
  })

  it('shows resend cooldown after the verification page opens', async () => {
    localStorage.setItem('pendingVerificationEmail', 'test@example.com')
    window.history.pushState({}, '', '/verify-email')
    
    render(<App />)
    
    const resendButton = screen.getByRole('button', { name: /resend in 30s/i })
    expect(resendButton).toBeDisabled()
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
    
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /sign in/i })
    
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
    const loginButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrong')
    await user.click(loginButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    
    // Should stay on login page
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })
})
