import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PENDING_EMAIL_CHANGE_KEY } from "@/constants/authStorage";
import { useAuth } from "@/hooks/useAuth";
import api from "@/utils/api";
import { getApiErrorMessage } from "@/utils/apiErrorMessage";
import { setUser } from "@/store/authSlice";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Mail, Shield } from "lucide-react";

interface ProfileFormData {
  first_name: string;
  last_name: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default function SettingsProfile() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);

  useEffect(() => {
    setNewEmail("");
    setEmailChangePassword("");
  }, [user?.email]);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileLoading(true);
    try {
      const res = await api.put("/auth/me", {
        first_name: data.first_name,
        last_name: data.last_name,
      });
      dispatch(setUser(res.data));
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRequestEmailChange = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) {
      toast.error("Enter a new email address.");
      return;
    }
    if (!emailChangePassword) {
      toast.error("Enter your current password to confirm.");
      return;
    }
    setEmailChangeLoading(true);
    try {
      const res = await api.post("/auth/me/request-email-change", {
        new_email: trimmed,
        password: emailChangePassword,
      });
      const normalized = trimmed.toLowerCase();
      localStorage.setItem(PENDING_EMAIL_CHANGE_KEY, normalized);
      setEmailChangePassword("");
      toast.success(res.data?.message || "Verification code sent.");
      navigate("/settings/verify-email-change");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not start email change."));
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const res = await api.post("/auth/me/resend-verification");
      toast.success(res.data?.message || "Check your email for a verification code.");
    } catch {
      toast.error("Could not send verification email. Try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (data.new_password !== data.confirm_password) {
      toast.error("New passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post("/auth/me/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      passwordForm.reset();
      toast.success("Password updated. You stay signed in on this device.");
      const me = await api.get("/auth/me");
      dispatch(setUser(me.data));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to change password."));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your name, email, and password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal information</CardTitle>
          <CardDescription>Your name appears across the app and in communications.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="profile-form" onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  {...profileForm.register("first_name", { required: "First name is required" })}
                />
                {profileForm.formState.errors.first_name?.message && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  {...profileForm.register("last_name", { required: "Last name is required" })}
                />
                {profileForm.formState.errors.last_name?.message && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="border-t bg-muted/30 py-4">
          <Button type="submit" form="profile-form" disabled={profileLoading || !profileForm.formState.isDirty}>
            {profileLoading ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-lg">Email</CardTitle>
          </div>
          <CardDescription>Sign-in and notifications use this address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 gap-y-2">
            <span className="text-sm font-medium text-foreground break-all">{user?.email}</span>
            {user?.email_verified ? (
              <Badge variant="secondary">Verified</Badge>
            ) : (
              <Badge variant="destructive">Not verified</Badge>
            )}
          </div>

          {!user?.email_verified && (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="mb-3">
                Verify your email to unlock all organization features. We&apos;ll send a code to your inbox.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={resendLoading} onClick={() => void handleResendVerification()}>
                  {resendLoading ? "Sending…" : "Resend code"}
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link to="/verify-email">Enter code</Link>
                </Button>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Change email</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;ll send a 6-digit code to the new address. You&apos;ll confirm it on the next screen (same
                experience as when you first signed up).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_email">New email</Label>
              <Input
                id="new_email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_change_password">Current password</Label>
              <Input
                id="email_change_password"
                type="password"
                autoComplete="current-password"
                value={emailChangePassword}
                onChange={(e) => setEmailChangePassword(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={emailChangeLoading}
              onClick={() => void handleRequestEmailChange()}
            >
              {emailChangeLoading ? "Sending…" : "Continue — send verification code"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-lg">Security</CardTitle>
          </div>
          <CardDescription>Update your password periodically to keep your account safe.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register("current_password", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("new_password", { required: true, minLength: 8 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("confirm_password", { required: true })}
              />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
