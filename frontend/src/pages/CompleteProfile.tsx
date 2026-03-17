import { CompleteProfileForm } from "@/components/CompleteProfileForm";

export default function CompleteProfile() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <span className="text-xl font-semibold text-gray-900">Kubrick</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-8">Complete your profile</h1>

        <CompleteProfileForm />
      </div>
    </div>
  );
}
