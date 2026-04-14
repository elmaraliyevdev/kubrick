import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export default function Login() {
  const { login, isLoginLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <img
            src="/logo.svg"
            alt="Kubrick"
            className="h-9 w-auto max-w-full"
            decoding="async"
          />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-8">Sign in</h1>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end">
            <a href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoginLoading}
            className="w-full h-10 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoginLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <a href="/signup" className="text-gray-900 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
