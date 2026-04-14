import { http, HttpResponse } from 'msw'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const otpSendGenericMessage =
  'If an account exists for this email, a verification code has been sent.'
const mockAuthenticatedKey = '__mockAuthenticated'
const mockNeedsProfileKey = '__mockNeedsProfile'

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
    
    globalThis.localStorage?.setItem(mockNeedsProfileKey, 'true')

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
    
    if (body.code === '000000') {
      return HttpResponse.json(
        { detail: 'Invalid or expired code' },
        { status: 400 }
      )
    }
    
    globalThis.localStorage?.setItem(mockAuthenticatedKey, 'true')

    return HttpResponse.json({
      access_token: 'mock-jwt-token',
      token_type: 'bearer'
    })
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    const hasMockSession = globalThis.localStorage?.getItem(mockAuthenticatedKey) === 'true'

    if (!authHeader && !request.headers.get('cookie')?.includes('access_token') && !hasMockSession) {
      return HttpResponse.json(
        { detail: 'Not authenticated' },
        { status: 401 }
      )
    }

    const pendingEmail = globalThis.localStorage?.getItem('pendingVerificationEmail')
    const needsProfile = globalThis.localStorage?.getItem(mockNeedsProfileKey) === 'true'

    return HttpResponse.json({
      id: 1,
      email: pendingEmail || 'test@example.com',
      first_name: pendingEmail || needsProfile ? null : 'Test',
      last_name: pendingEmail || needsProfile ? null : 'User',
      organization: pendingEmail || needsProfile
        ? null
        : {
            id: 1,
            name: 'Test Corp',
            slug: 'test-corp',
          },
      email_verified: true,
      role: 'admin',
      is_active: true,
    })
  }),

  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json({}, { status: 204 })
  }),

  // Complete profile endpoint
  http.post(`${API_BASE}/auth/complete-profile`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const hasMockSession = globalThis.localStorage?.getItem(mockAuthenticatedKey) === 'true'
    
    if ((!authHeader || !authHeader.startsWith('Bearer ')) && !hasMockSession) {
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
    
    globalThis.localStorage?.setItem(mockNeedsProfileKey, 'false')

    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      first_name: body.first_name,
      last_name: body.last_name,
      email_verified: true,
      role: 'admin',
      is_active: true,
      organization: {
        id: 1,
        name: body.organization_name,
        slug: 'test-corp',
      }
    })
  }),

  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json({
      period: '7d',
      open_positions: 0,
      new_applications: 0,
      new_applications_7d: 0,
      new_candidates: 0,
      new_jobs: 0,
      candidates_to_review: 0,
      top_match_score: null,
      trends: { applications: 0 },
      range: { start: new Date().toISOString(), end: new Date().toISOString() },
    })
  }),

  http.get(`${API_BASE}/dashboard/applications`, () => {
    return HttpResponse.json([])
  }),

  http.get(`${API_BASE}/candidates/`, () => {
    return HttpResponse.json([])
  }),

  http.get(`${API_BASE}/jobs/`, () => {
    return HttpResponse.json([])
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
    
    globalThis.localStorage?.setItem(mockAuthenticatedKey, 'true')
    globalThis.localStorage?.setItem(mockNeedsProfileKey, 'false')

    return HttpResponse.json({
      access_token: 'mock-jwt-token',
      token_type: 'bearer'
    })
  }),

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
