import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type Step = "request" | "verify";

export function LoginOtpForm({ className, ...props }: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("request");

  const { requestOTPAsync, verifyOTP, isOTPLoading, isRequestingOTP, error } = useAuth();

  const handleRequestOTP = async () => {
    try {
      await requestOTPAsync({ email });
      setStep("verify");
    } catch {
      // Error is already dispatched to Redux by the mutation's onError
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "request") {
      handleRequestOTP();
    } else {
      verifyOTP({ email, code });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">
          {step === "request" ? "Login with Email" : "Enter Verification Code"}
        </h1>
        <p className="text-muted-foreground text-sm text-balance">
          {step === "request"
            ? "Enter your email to receive a one-time code"
            : "Check your inbox and enter the code below"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {step === "request" ? (
          <div className="grid gap-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
        ) : (
          <div className="grid gap-3">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              required
            />
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isRequestingOTP || isOTPLoading}
        >
          {step === "request"
            ? isRequestingOTP
              ? "Sending..."
              : "Send Code"
            : isOTPLoading
              ? "Verifying..."
              : "Verify Code"}
        </Button>
      </div>
    </form>
  );
}
