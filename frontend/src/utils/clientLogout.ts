import { queryClient } from "@/lib/queryClient";
import { logout } from "@/store/authSlice";
import { store } from "@/store";

type ClientLogoutOptions = {
  /**
   * If true, performs a hard redirect via window.location.href.
   * Prefer this when called from axios interceptors to avoid router/state races.
   */
  redirectTo?: string;
  /** Avoid redirect loops when already on an auth route. */
  skipRedirectIf?: (pathname: string) => boolean;
};

export function clientLogout(options: ClientLogoutOptions = {}) {
  // Clear server-state cache first to avoid leaking org-scoped data between sessions.
  queryClient.clear();

  // Clear client auth state.
  store.dispatch(logout());

  // Any other auth-related client markers.
  localStorage.removeItem("pendingVerificationEmail");

  if (options.redirectTo) {
    const pathname = window.location.pathname;
    const defaultSkip =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/signup");
    const shouldSkip = options.skipRedirectIf?.(pathname) ?? defaultSkip;

    if (!shouldSkip) {
      window.location.href = options.redirectTo;
    }
  }
}

