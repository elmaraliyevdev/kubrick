// Auth-related types consolidated in one place

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name?: string;
}

export interface OTPRequest {
  email: string;
}

export interface OTPVerification {
  email: string;
  code: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  website_url?: string | null;
  brand_color?: string | null;
  career_page_enabled?: boolean;
}

export type UserRole = "admin" | "recruiter";

export interface User {
  id: number;
  email: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  organization_id: number | null;
  role: UserRole;
  is_active: boolean;
  organization?: Organization | null;
}

/** Session truth: only `"authenticated"` after a validated session (e.g. `/auth/me` or post-login `setUser`). */
export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface AuthState {
  token: string | null;
  user: User | null;
  authStatus: AuthStatus;
  isLoading: boolean;
  error: string | null;
}
