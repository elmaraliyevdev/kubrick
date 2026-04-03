import api from "@/utils/api";
import type { RootState } from "@/store";
import { logout, setUser } from "@/store/authSlice";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, authStatus } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const validatedRef = useRef(false);

  // Always validate the session on mount by calling /auth/me.
  // This handles: page refresh, expired access tokens (interceptor will refresh),
  // and the case where localStorage was cleared but cookies are still valid.
  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    const validateSession = async () => {
      try {
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));
      } catch {
        // /auth/me failed even after refresh attempt — session is dead
        dispatch(logout());
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [dispatch]);

  // Show spinner while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated after validation (never trust cached localStorage alone)
  if (authStatus !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  // Check if user's email is verified (allow verify flow + settings so users can resend codes / read status)
  const isOnVerifyEmailPage = location.pathname === "/verify-email";
  const isOnSettingsPage = location.pathname.startsWith("/settings");
  if (user && !user.email_verified && !isOnVerifyEmailPage && !isOnSettingsPage) {
    localStorage.setItem("pendingVerificationEmail", user.email);
    return <Navigate to="/verify-email" replace />;
  }

  // If profile incomplete, redirect to complete profile
  const isOnCompleteProfilePage = location.pathname === "/complete-profile";
  if (
    user &&
    user.email_verified &&
    (!user.first_name || !user.last_name || !user.organization) &&
    !isOnCompleteProfilePage
  ) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}
