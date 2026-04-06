import { VerificationCodeBoxes } from "@/components/VerificationCodeBoxes";
import { Button } from "@/components/ui/button";
import { PENDING_EMAIL_CHANGE_KEY } from "@/constants/authStorage";
import api from "@/utils/api";
import { getApiErrorMessage } from "@/utils/apiErrorMessage";
import { setUser } from "@/store/authSlice";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Confirms a new account email after the user requested a change from Profile settings.
 * UX matches `/verify-email` (sign-up): full-page, six digit boxes, resend, back link.
 */
export default function VerifyEmailChange() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_EMAIL_CHANGE_KEY)?.trim();
    if (!pending) {
      navigate("/settings/profile", { replace: true });
      return;
    }
    setEmail(pending);
    setResendCooldown(30);
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const clearPendingAndGoProfile = () => {
    localStorage.removeItem(PENDING_EMAIL_CHANGE_KEY);
    navigate("/settings/profile");
  };

  const handleResend = async () => {
    if (!email || isResending || resendCooldown > 0) return;
    setIsResending(true);
    setError(null);
    setResendSuccess(false);
    try {
      await api.post("/auth/me/resend-email-change");
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
      setResendCooldown(30);
      setCode(["", "", "", "", "", ""]);
      toast.success("We sent a new code to your email.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not resend the code."));
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6 || !email) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post("/auth/me/confirm-email-change", {
        new_email: email,
        code: fullCode,
      });
      queryClient.clear();
      const me = await api.get("/auth/me");
      dispatch(setUser(me.data));
      localStorage.removeItem(PENDING_EMAIL_CHANGE_KEY);
      toast.success("Your email address has been updated.");
      navigate("/settings/profile", { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Invalid or expired code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCodeComplete = code.every((c) => c !== "");

  if (!email) {
    return (
      <div className="min-h-svh bg-muted/30 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-muted/30 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight text-foreground hover:opacity-90">
            Kubrick
          </Link>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8">
          <h1 className="text-xl font-semibold tracking-tight mb-1">Confirm your new email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the 6-digit code we sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>

          {error && (
            <p className="text-sm text-destructive mb-4" role="alert">
              {error}
            </p>
          )}
          {resendSuccess && (
            <p className="text-sm text-green-600 dark:text-green-500 mb-4">New code sent.</p>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
            <VerificationCodeBoxes value={code} onChange={setCode} disabled={isSubmitting} />

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !isCodeComplete}>
              {isSubmitting ? "Confirming…" : "Confirm new email"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <span>Didn&apos;t receive a code? </span>
            <button
              type="button"
              onClick={() => void handleResend()}
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

          <div className="mt-8 pt-6 border-t text-center">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearPendingAndGoProfile}>
              Cancel — return to profile settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
