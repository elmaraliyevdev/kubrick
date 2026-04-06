import { VerificationCodeBoxes } from "@/components/VerificationCodeBoxes";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { verifyOTP, isOTPLoading, error } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pendingVerificationEmail");
    if (!pendingEmail) {
      navigate("/signup");
      return;
    }
    setEmail(pendingEmail);
    setResendCooldown(30);
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const t = window.setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [resendCooldown]);

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
    } catch (err) {
      console.error("Failed to resend code:", err);
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
    <div className="min-h-svh bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="text-lg font-semibold tracking-tight text-foreground">Kubrick</span>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8">
          <h1 className="text-xl font-semibold tracking-tight mb-1">Verify your email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a code to <span className="font-medium text-foreground">{email}</span>
          </p>

          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          {resendSuccess && <p className="text-sm text-green-600 dark:text-green-500 mb-4">Code resent successfully</p>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <VerificationCodeBoxes value={code} onChange={setCode} disabled={isOTPLoading} autoFocus />

            <button
              type="submit"
              disabled={isOTPLoading || !isCodeComplete}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {isOTPLoading ? "Verifying…" : "Verify"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <span>Didn&apos;t receive a code? </span>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending || resendCooldown > 0}
              className="font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : isResending
                  ? "Sending…"
                  : "Resend code"}
            </button>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/signup"
              onClick={() => localStorage.removeItem("pendingVerificationEmail")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
