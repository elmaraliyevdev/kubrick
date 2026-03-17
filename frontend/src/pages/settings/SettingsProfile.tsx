import { useAuth } from "@/hooks/useAuth";
import api from "@/utils/api";
import { setUser } from "@/store/authSlice";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface ProfileFormData {
  first_name: string;
  last_name: string;
}

export default function SettingsProfile() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);

    try {
      const res = await api.put('/auth/me', {
        first_name: data.first_name,
        last_name: data.last_name,
      });
      dispatch(setUser(res.data));
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-medium text-gray-900">Profile Settings</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Personal Information</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <label htmlFor="first_name" className="text-sm text-gray-700">First Name</label>
            <input
              id="first_name"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('first_name', { required: 'First name is required' })}
            />
            {errors.first_name?.message && (
              <p className="text-sm text-red-500">{errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="last_name" className="text-sm text-gray-700">Last Name</label>
            <input
              id="last_name"
              className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('last_name', { required: 'Last name is required' })}
            />
            {errors.last_name?.message && (
              <p className="text-sm text-red-500">{errors.last_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Email</label>
            <p className="text-sm text-gray-900">{user?.email}</p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isDirty}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
