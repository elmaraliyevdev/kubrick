import api from "@/utils/api";
import type { RootState } from "@/store";
import { setUser } from "@/store/authSlice";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [isLoadingUser, setIsLoadingUser] = useState(!user && isAuthenticated);
  const fetchedRef = useRef(false);

  // Fetch user data if authenticated but no user data loaded
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated) {
        setIsLoadingUser(false);
        return;
      }

      // Fetch if no user data, or if user has organization_id but no organization object
      const shouldFetch = !user || (user.organization_id && !user.organization);

      if (shouldFetch && !fetchedRef.current) {
        fetchedRef.current = true;
        setIsLoadingUser(true);
        try {
          const res = await api.get("/auth/me");
          dispatch(setUser(res.data));
        } catch (error) {
          // 401 is handled by the api interceptor (redirects to /login)
          console.error("Failed to fetch user profile:", error);
        } finally {
          setIsLoadingUser(false);
        }
      } else {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated, user, dispatch]);

  // Not logged in - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading while fetching user data
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user's email is verified
  const isOnVerifyEmailPage = location.pathname === '/verify-email';
  if (user && !user.email_verified && !isOnVerifyEmailPage) {
    // Store email for verification flow
    localStorage.setItem("pendingVerificationEmail", user.email);
    return <Navigate to="/verify-email" replace />;
  }

  // If user is logged in but hasn't completed their profile, redirect to complete profile
  const isOnCompleteProfilePage = location.pathname === '/complete-profile';
  if (user && user.email_verified && (!user.first_name || !user.last_name || !user.organization) && !isOnCompleteProfilePage) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}
