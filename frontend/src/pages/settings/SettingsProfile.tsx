import { useAuth } from "@/hooks/useAuth";
import api from "@/utils/api";
import { setUser } from "@/store/authSlice";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-medium text-gray-900">Profile Settings</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Personal Information</h2>

        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <label htmlFor="first_name" className="text-sm text-gray-700">
              First Name
            </label>
            <input
              id="first_name"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...profileForm.register("first_name", { required: "First name is required" })}
            />
            {profileForm.formState.errors.first_name?.message && (
              <p className="text-sm text-red-500">{profileForm.formState.errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="last_name" className="text-sm text-gray-700">
              Last Name
            </label>
            <input
              id="last_name"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...profileForm.register("last_name", { required: "Last name is required" })}
            />
            {profileForm.formState.errors.last_name?.message && (
              <p className="text-sm text-red-500">{profileForm.formState.errors.last_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Email</label>
            <p className="text-sm text-gray-900">{user?.email}</p>
          </div>

          <button
            type="submit"
            disabled={profileLoading || !profileForm.formState.isDirty}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {profileLoading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 max-w-md">
        <h2 className="text-sm font-medium text-gray-900">Email verification</h2>
        {user?.email_verified ? (
          <p className="text-sm text-gray-600">Your email is verified.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Your email is not verified yet. Some organization features stay locked until you verify.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={resendLoading}
                onClick={() => void handleResendVerification()}
                className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {resendLoading ? "Sending…" : "Resend code"}
              </button>
              <Link
                to="/verify-email"
                className="inline-flex items-center justify-center border border-gray-200 rounded-md h-9 px-4 text-sm hover:bg-gray-50"
              >
                Enter code
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Security</h2>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <label htmlFor="current_password" className="text-sm text-gray-700">
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...passwordForm.register("current_password", { required: true })}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_password" className="text-sm text-gray-700">
              New password
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...passwordForm.register("new_password", { required: true, minLength: 8 })}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm_password" className="text-sm text-gray-700">
              Confirm new password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...passwordForm.register("confirm_password", { required: true })}
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {passwordLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
