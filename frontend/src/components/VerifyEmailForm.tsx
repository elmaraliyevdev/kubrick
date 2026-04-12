import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function VerifyEmailForm() {
  const navigate = useNavigate();
  const { verifyOTP, isOTPLoading, error } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pendingVerificationEmail");
    if (!pendingEmail) {
      navigate("/register");
      return;
    }
    setEmail(pendingEmail);
    setIsCodeSent(true); // Email was already sent during registration
  }, [navigate]);

  const handleResendCode = async () => {
    if (email) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/resend-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          setIsCodeSent(true);
        }
      } catch (error) {
        console.error("Failed to resend code:", error);
      }
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode && email) {
      verifyOTP({
        email,
        code: verificationCode,
      });
    }
  };

  const handleBackToRegister = () => {
    localStorage.removeItem("pendingVerificationEmail");
    navigate("/register");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="text-muted-foreground text-sm text-balance">
          We've sent a verification code to <strong>{email}</strong>
        </p>
        <p className="text-muted-foreground text-xs">
          Please check your email and enter the code below
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isCodeSent && (
        <Alert>
          <AlertTitle>Email sent!</AlertTitle>
          <AlertDescription>Check your inbox for the verification code</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
        <div className="grid gap-3">
          <label htmlFor="code" className="text-sm font-medium">
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            maxLength={6}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isOTPLoading || !verificationCode}>
          {isOTPLoading ? "Verifying..." : "Verify Email"}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleResendCode}
          disabled={isOTPLoading}
          className="w-full"
        >
          {isOTPLoading ? "Sending..." : "Resend Code"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={handleBackToRegister}
          className="w-full text-sm"
        >
          Back to Registration
        </Button>
      </div>
    </div>
  );
}
