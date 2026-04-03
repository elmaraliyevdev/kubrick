import { http, HttpResponse } from 'msw'

const API_BASE = 'http://127.0.0.1:8000/api'

export const handlers = [
  // Registration endpoint
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { detail: 'Email already registered' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      id: 1,
      email: body.email,
      first_name: null,
      last_name: null,
      organization: null,
      email_verified: false
    })
  }),

  // Email verification endpoint
  http.post(`${API_BASE}/auth/verify-code`, async ({ request }) => {
    const body = await request.json() as { email: string; code: string }
    
    if (body.code === 'invalid') {
      return HttpResponse.json(
        { detail: 'Invalid or expired code' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      access_token: 'mock-jwt-token',
      token_type: 'bearer'
    })
  }),

  // Complete profile endpoint
  http.post(`${API_BASE}/auth/complete-profile`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { detail: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const body = await request.json() as {
      first_name: string
      last_name: string
      organization_name: string
    }
    
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      first_name: body.first_name,
      last_name: body.last_name,
      organization: {
        id: 1,
        name: body.organization_name
      }
    })
  }),

  // Login endpoint
  http.post(`${API_BASE}/auth/login-password`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'wrong@example.com' || body.password === 'wrong') {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      access_token: 'mock-jwt-token',
      token_type: 'bearer'
    })
  }),

  const otpSendGenericMessage =
    'If an account exists for this email, a verification code has been sent.'

  // Request OTP endpoint (generic response — anti-enumeration)
  http.post(`${API_BASE}/auth/request-code`, async () => {
    return HttpResponse.json({
      message: otpSendGenericMessage,
    })
  }),

  // Resend verification endpoint (same generic response for all emails)
  http.post(`${API_BASE}/auth/resend-verification`, async () => {
    return HttpResponse.json({
      message: otpSendGenericMessage,
    })
  }),
]