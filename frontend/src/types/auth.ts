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
}

export interface User {
  id: number;
  email: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  organization_id: number | null;
  organization?: Organization | null;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
