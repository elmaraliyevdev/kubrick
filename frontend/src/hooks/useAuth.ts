import type { RootState } from "@/store";
import { loginSuccess, logout, setError, setUser } from "@/store/authSlice";
import type { LoginCredentials, OTPRequest, OTPVerification, RegisterCredentials, User } from "@/types/auth";
import api from "@/utils/api";
import { useMutation } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

/**
 * Extract a human-readable error message from an axios error.
 * Handles both string `detail` and Pydantic 422 validation error arrays.
 */
function extractAxiosError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const body = (err as { response?: { data?: unknown } }).response?.data;
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        return detail.map((e: { msg?: string }) => e.msg ?? "").filter(Boolean).join("; ");
      }
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  // Helper function to fetch user profile.
  // Uses the token directly when available (right after login), otherwise relies on the httpOnly cookie.
  const fetchUserProfile = async (accessToken?: string): Promise<User> => {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    const res = await api.get("/auth/me", { headers });
    return res.data;
  };

  // Helper function to navigate based on user status
  const navigateBasedOnUserStatus = (userProfile: User) => {
    if (!userProfile.email_verified) {
      // Not verified - go to verify email page
      localStorage.setItem("pendingVerificationEmail", userProfile.email);
      navigate("/verify-email");
    } else if (!userProfile.first_name || !userProfile.last_name || !userProfile.organization) {
      // Verified but profile incomplete - go to complete profile
      navigate("/complete-profile");
    } else {
      // Fully set up - go to dashboard
      navigate("/dashboard");
    }
  };

  // Login with password
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await api.post("/auth/login-password", credentials);
      return res.data;
    },
    onSuccess: async (data) => {
      // Mark as authenticated immediately so ProtectedRoute doesn't redirect
      dispatch(loginSuccess({}));

      // Use the token from the response for the immediate profile fetch
      // (the httpOnly cookie may not be available yet for cross-origin dev setups)
      try {
        const userProfile = await fetchUserProfile(data.access_token);
        dispatch(setUser(userProfile));
        navigateBasedOnUserStatus(userProfile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        navigate("/dashboard");
      }
    },
    onError: (err: unknown) => {
      dispatch(setError(extractAxiosError(err, "Login failed")));
    },
  });

  // Register
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const res = await api.post("/auth/register", credentials);
      return res.data;
    },
    onSuccess: (data) => {
      // Store email for verification flow
      localStorage.setItem("pendingVerificationEmail", data.email || "");
      navigate("/verify-email");
    },
    onError: (err: unknown) => {
      dispatch(setError(extractAxiosError(err, "Registration failed")));
    },
  });

  // Request OTP
  const requestOTPMutation = useMutation({
    mutationFn: async (data: OTPRequest) => {
      const res = await api.post("/auth/request-code", data);
      return res.data;
    },
    onError: (err: unknown) => {
      dispatch(setError(extractAxiosError(err, "Failed to send code")));
    },
  });

  // Verify OTP
  const verifyOTPMutation = useMutation({
    mutationFn: async (data: OTPVerification) => {
      const res = await api.post("/auth/verify-code", data);
      return res.data;
    },
    onSuccess: async (data) => {
      // Mark as authenticated immediately
      dispatch(loginSuccess({}));

      try {
        const userProfile = await fetchUserProfile(data.access_token);
        dispatch(setUser(userProfile));

        // Clear pending email
        localStorage.removeItem("pendingVerificationEmail");

        // Navigate based on user status
        navigateBasedOnUserStatus(userProfile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        navigate("/dashboard");
      }
    },
    onError: (err: unknown) => {
      dispatch(setError(extractAxiosError(err, "Verification failed")));
    },
  });

  // Logout function — intentionally uses raw fetch to avoid the 401 interceptor redirect race
  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Best-effort — clear client state even if backend call fails
    }
    dispatch(logout());
    navigate("/login");
  };

  return {
    // State
    token,
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    requestOTP: requestOTPMutation.mutate,
    requestOTPAsync: requestOTPMutation.mutateAsync,
    verifyOTP: verifyOTPMutation.mutate,
    logout: handleLogout,

    // Loading states
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isOTPLoading: requestOTPMutation.isPending || verifyOTPMutation.isPending,
    isRequestingOTP: requestOTPMutation.isPending,
  };
};
