import { useJob } from "@/hooks/useJobs";
import { useLocation, useParams } from "react-router-dom";

interface Breadcrumb {
  label: string;
  href?: string;
}

export function useBreadcrumbs(): Breadcrumb[] {
  const location = useLocation();
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job } = useJob(parseInt(jobId || "0"));

  const pathname = location.pathname;

  // Handle job detail pages
  if (pathname.startsWith("/jobs/") && jobId) {
    return [{ label: "Jobs", href: "/jobs" }, { label: job?.title || "Job Details" }];
  }

  // Handle other routes
  const routeMap: Record<string, Breadcrumb[]> = {
    "/dashboard": [{ label: "Dashboard" }],
    "/jobs": [{ label: "Jobs" }],
    "/candidates": [{ label: "Candidates" }],
    "/analytics": [{ label: "Analytics" }],
    "/settings": [{ label: "Settings" }],
  };

  return routeMap[pathname] || [{ label: "Dashboard" }];
}
