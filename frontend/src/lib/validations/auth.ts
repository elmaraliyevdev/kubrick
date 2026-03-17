import { z } from 'zod';

export const loginPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

export const otpRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const otpVerifySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Verification code must contain only numbers'),
});

export const completeProfileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters'),
});

export type LoginPasswordForm = z.infer<typeof loginPasswordSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type OTPRequestForm = z.infer<typeof otpRequestSchema>;
export type OTPVerifyForm = z.infer<typeof otpVerifySchema>;
export type CompleteProfileForm = z.infer<typeof completeProfileSchema>;