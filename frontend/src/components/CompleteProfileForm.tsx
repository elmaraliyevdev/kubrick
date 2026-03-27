import api from "@/utils/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/authSlice";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

type CompleteProfileValues = {
  first_name: string;
  last_name: string;
  organization_name: string;
};

export function CompleteProfileForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState<CompleteProfileValues>({
    first_name: "",
    last_name: "",
    organization_name: "",
  });
  const [didPrefill, setDidPrefill] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);

  // Pre-fill names from the registration step (backend splits `full_name` into first/last),
  // then request only what's missing (usually `organization_name`).
  useEffect(() => {
    if (!user || didPrefill) return;

    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      organization_name: user.organization?.name ?? "",
    });
    setDidPrefill(true);
  }, [user, didPrefill]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.first_name || !form.last_name || !form.organization_name) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/complete-profile", form);
      dispatch(setUser(response.data));
      navigate("/dashboard");
    } catch (err) {
      console.error("Complete profile error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to complete profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div>
        <label htmlFor="first_name" className="block text-sm text-gray-700 mb-1.5">
          First name
        </label>
        <input
          id="first_name"
          name="first_name"
          type="text"
          value={form.first_name}
          onChange={handleChange}
          className="w-full h-10 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="last_name" className="block text-sm text-gray-700 mb-1.5">
          Last name
        </label>
        <input
          id="last_name"
          name="last_name"
          type="text"
          value={form.last_name}
          onChange={handleChange}
          className="w-full h-10 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="organization_name" className="block text-sm text-gray-700 mb-1.5">
          Organization name
        </label>
        <input
          id="organization_name"
          name="organization_name"
          type="text"
          value={form.organization_name}
          onChange={handleChange}
          className="w-full h-10 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
