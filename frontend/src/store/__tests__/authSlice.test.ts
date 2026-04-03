import { describe, it, expect, beforeEach } from "vitest";
import authReducer, {
  loginSuccess,
  logout,
  setError,
  setLoading,
  setUser,
  clearError,
} from "../authSlice";

describe("authSlice", () => {
  const initialState = {
    token: null,
    user: null,
    authStatus: "unknown" as const,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("should return initial state", () => {
    expect(authReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("should handle setLoading", () => {
    const state = authReducer(initialState, setLoading(true));
    expect(state.isLoading).toBe(true);
  });

  it("should handle setError", () => {
    const errorMessage = "Login failed";
    const state = authReducer(initialState, setError(errorMessage));
    expect(state.error).toBe(errorMessage);
  });

  it("should handle clearError", () => {
    const stateWithError = {
      ...initialState,
      error: "Some error",
    };
    const state = authReducer(stateWithError, clearError());
    expect(state.error).toBe(null);
  });

  it("should handle loginSuccess with user", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      email_verified: true,
      first_name: "John",
      last_name: "Doe",
      organization_id: 1,
    };

    const state = authReducer(initialState, loginSuccess({ user }));

    expect(state.token).toBe(null);
    expect(state.user).toEqual(user);
    expect(state.authStatus).toBe("authenticated");
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
    expect(localStorage.getItem("user")).toBe(JSON.stringify(user));
  });

  it("should handle loginSuccess without user (awaiting profile)", () => {
    const state = authReducer(initialState, loginSuccess({}));

    expect(state.user).toBe(null);
    expect(state.authStatus).toBe("unknown");
  });

  it("should handle setUser", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      email_verified: true,
      first_name: "John",
      last_name: "Doe",
      organization_id: 1,
    };

    const state = authReducer(initialState, setUser(user));

    expect(state.user).toEqual(user);
    expect(state.authStatus).toBe("authenticated");
    expect(localStorage.getItem("user")).toBe(JSON.stringify(user));
  });

  it("should handle logout", () => {
    const loggedInState = {
      token: null,
      user: {
        id: 1,
        email: "test@example.com",
        email_verified: true,
        first_name: "John",
        last_name: "Doe",
        organization_id: 1,
      },
      authStatus: "authenticated" as const,
      isLoading: false,
      error: null,
    };

    localStorage.setItem("user", JSON.stringify(loggedInState.user));

    const state = authReducer(loggedInState, logout());

    expect(state.user).toBe(null);
    expect(state.authStatus).toBe("unauthenticated");
    expect(localStorage.getItem("user")).toBe(null);
  });
});
