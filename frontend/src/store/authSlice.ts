import type { AuthState, User } from "@/types/auth";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

// Re-export types for backward compatibility
export type { AuthState, AuthStatus, Organization, User } from "@/types/auth";

const initialState: AuthState = {
  token: null,
  user: null,
  /** Never derive this from cached localStorage — wait for `/auth/me` or explicit `setUser` after login. */
  authStatus: "unknown",
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    loginSuccess: (
      state,
      action: PayloadAction<{ token?: string; user?: User }>
    ) => {
      state.token = null;
      state.isLoading = false;
      state.error = null;
      if (action.payload.user) {
        state.user = action.payload.user;
        state.authStatus = "authenticated";
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      } else {
        /* Password/OTP flow: not authenticated until `setUser` from `/auth/me`. */
        state.authStatus = "unknown";
      }
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.authStatus = "unauthenticated";
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem("user");
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.authStatus = "authenticated";
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  loginSuccess,
  logout,
  setUser,
  clearError,
} = authSlice.actions;
export default authSlice.reducer;
