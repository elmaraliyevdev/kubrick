import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="h-10 px-6 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
