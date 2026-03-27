import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { verifyOTP, isOTPLoading, error } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pendingVerificationEmail");
    if (!pendingEmail) {
      navigate("/signup");
      return;
    }
    setEmail(pendingEmail);
    inputRefs.current[0]?.focus();
    // A code was sent during registration; prevent immediate resend.
    setResendCooldown(30);
  }, [navigate]);

  // Resend cooldown timer (UX only; backend also rate-limits).
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const t = window.setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    const nextEmptyIndex = newCode.findIndex((c) => !c);
    inputRefs.current[nextEmptyIndex !== -1 ? nextEmptyIndex : 5]?.focus();
  };

  const handleResendCode = async () => {
    if (!email || isResending || resendCooldown > 0) return;
    setIsResending(true);
    setResendSuccess(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
        setResendCooldown(30);
      }
    } catch (error) {
      console.error("Failed to resend code:", error);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length === 6 && email) {
      verifyOTP({ email, code: fullCode });
    }
  };

  const isCodeComplete = code.every((c) => c !== "");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <span className="text-xl font-semibold text-gray-900">Kubrick</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">Verify your email</h1>
        <p className="text-sm text-gray-500 mb-8">
          We sent a code to <span className="text-gray-700">{email}</span>
        </p>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {resendSuccess && (
          <p className="text-sm text-green-600 mb-4">Code resent successfully</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-10 h-10 text-center text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isOTPLoading || !isCodeComplete}
            className="w-full h-10 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOTPLoading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-500">Didn't receive a code? </span>
          <button
            onClick={handleResendCode}
            disabled={isResending || resendCooldown > 0}
            className="text-sm text-gray-900 hover:underline disabled:opacity-50"
          >
            {resendCooldown > 0
              ? `Resend in ${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, "0")}`
              : isResending
                ? "Sending..."
                : "Resend code"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/signup"
            onClick={() => localStorage.removeItem("pendingVerificationEmail")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back to sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
