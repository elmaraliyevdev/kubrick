import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Something went wrong");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <span className="text-xl font-semibold text-gray-900">Kubrick</span>
        </div>

        {!sent ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Reset password</h1>
            <p className="text-sm text-gray-500 mb-8">Enter your email</p>

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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send reset code"}
              </button>
            </form>

            <p className="mt-8 text-center">
              <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">
                Back to sign in
              </a>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Check your email</h1>
            <p className="text-sm text-gray-500 mb-8">
              If an account with <span className="text-gray-700">{email}</span> exists, we sent a 6-digit reset code.
            </p>

            <button
              onClick={() => navigate("/reset-password", { state: { email } })}
              className="w-full h-10 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
            >
              Enter reset code
            </button>

            <p className="mt-8 text-center">
              <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">
                Back to sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
