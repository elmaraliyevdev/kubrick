import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../useAuth";

const mockNavigate = vi.fn();
const mockDispatch = vi.fn();

const authState = vi.hoisted(() => ({
  auth: {
    token: null,
    user: null,
    authStatus: "unauthenticated",
    isLoading: false,
    error: null,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-redux", async () => {
  const actual = await vi.importActual<typeof import("react-redux")>("react-redux");
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: (state: typeof authState) => unknown) => selector(authState),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authState.auth = {
      token: null,
      user: null,
      authStatus: "unauthenticated",
      isLoading: false,
      error: null,
    };
  });

  it("returns initial unauthenticated state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBe(null);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoginLoading).toBe(false);
    expect(result.current.isRegisterLoading).toBe(false);
  });

  it("exposes authenticated state from the store", () => {
    authState.auth = {
      token: null,
      user: {
        id: 1,
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        email_verified: true,
        role: "admin",
        is_active: true,
        organization: { id: 1, name: "Org", slug: "org" },
      },
      authStatus: "authenticated",
      isLoading: false,
      error: null,
    };

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("test@example.com");
  });

  it("clears client state on logout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await result.current.logout();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
