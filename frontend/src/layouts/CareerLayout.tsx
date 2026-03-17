import { Outlet, useParams } from "react-router-dom";
import { useCareerPage } from "@/hooks/useCareers";

export default function CareerLayout() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data } = useCareerPage(orgSlug || "");

  const orgName = data?.organization?.name || orgSlug || "";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 h-16 flex items-center">
          <span className="text-sm font-medium text-gray-900">{orgName}</span>
          <span className="text-sm text-gray-400 ml-3">Careers</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-8 text-center text-xs text-gray-400">
          Powered by Kubrick HR
        </div>
      </footer>
    </div>
  );
}
