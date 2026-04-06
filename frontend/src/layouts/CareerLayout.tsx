import { Link, Outlet, useParams } from "react-router-dom";
import { useCareerPage } from "@/hooks/useCareers";

interface CareerLayoutProps {
  orgSlug?: string;
}

export default function CareerLayout({ orgSlug: propSlug }: CareerLayoutProps) {
  const { orgSlug: paramSlug } = useParams<{ orgSlug: string }>();
  const orgSlug = propSlug || paramSlug || "";
  const { data } = useCareerPage(orgSlug);

  const orgName = data?.organization?.name || orgSlug || "";
  const indexHref = propSlug ? "/" : `/${orgSlug}`;

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <header className="border-b border-border/80 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link
            to={indexHref}
            className="text-base sm:text-lg font-semibold tracking-tight text-foreground hover:opacity-90 transition-opacity truncate"
          >
            {orgName}
          </Link>
          <span className="text-sm text-muted-foreground shrink-0 hidden sm:inline">Careers</span>
        </div>
      </header>

      <main className="flex-1 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
          <Outlet context={{ orgSlug }} />
        </div>
      </main>

      <footer className="border-t border-border py-8 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 text-center text-xs text-muted-foreground">
          Powered by Kubrick
        </div>
      </footer>
    </div>
  );
}
