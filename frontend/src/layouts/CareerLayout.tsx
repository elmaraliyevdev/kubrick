import { Outlet, useParams } from "react-router-dom";
import { useCareerPage } from "@/hooks/useCareers";

interface CareerLayoutProps {
  orgSlug?: string;
}

export default function CareerLayout({ orgSlug: propSlug }: CareerLayoutProps) {
  const { orgSlug: paramSlug } = useParams<{ orgSlug: string }>();
  const orgSlug = propSlug || paramSlug || "";
  const { data } = useCareerPage(orgSlug);

  const orgName = data?.organization?.name || orgSlug || "";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-8 h-16 flex items-center">
          <span className="text-sm font-medium text-foreground">{orgName}</span>
          <span className="text-sm text-muted-foreground ml-3">Careers</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <Outlet context={{ orgSlug }} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-8 text-center text-xs text-muted-foreground">
          Powered by Kubrick
        </div>
      </footer>
    </div>
  );
}
