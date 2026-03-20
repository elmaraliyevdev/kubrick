import type { AuthState, User } from "@/types/auth";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

// Re-export types for backward compatibility
export type { AuthState, Organization, User } from "@/types/auth";

const initialState: AuthState = {
  token: null,
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null,
  // Start as true if we have cached user data — ProtectedRoute will validate via /auth/me
  isAuthenticated: !!localStorage.getItem("user"),
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
      state.user = action.payload.user || null;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      if (action.payload.user) {
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      }
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem("user");
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
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
