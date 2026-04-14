import { useCandidate } from "@/hooks/useCandidates";
import { useJob } from "@/hooks/useJobs";
import { useLocation, useParams } from "react-router-dom";

interface Breadcrumb {
  label: string;
  href?: string;
}

export function useBreadcrumbs(): Breadcrumb[] {
  const location = useLocation();
  const params = useParams<{ jobId: string; candidateId: string }>();
  const pathname = location.pathname;

  const jobId = params.jobId ? parseInt(params.jobId, 10) : 0;
  const candidateId = params.candidateId ? parseInt(params.candidateId) : 0;

  const { data: job } = useJob(jobId);
  const { data: candidate } = useCandidate(candidateId);

  // Job detail: Jobs > Job Title (skip numeric check failed for non-numeric segments)
  if (pathname.startsWith("/jobs/") && jobId && !Number.isNaN(jobId)) {
    return [
      { label: "Jobs", href: "/jobs" },
      { label: job?.title || "Job Details" },
    ];
  }

  // Candidate detail: Candidates > Name or Email
  if (pathname.startsWith("/candidates/") && candidateId) {
    const candidateLabel =
      candidate?.first_name && candidate?.last_name
        ? `${candidate.first_name} ${candidate.last_name}`
        : candidate?.email || "Candidate Details";
    return [
      { label: "Candidates", href: "/candidates" },
      { label: candidateLabel },
    ];
  }

  // Settings sub-pages
  if (pathname.startsWith("/settings/")) {
    const settingsRoutes: Record<string, string> = {
      "/settings/profile": "Profile",
      "/settings/organization": "Organization",
      "/settings/career-page": "Career Page",
      "/settings/email": "Email",
      "/settings/matching": "Matching",
    };
    const subLabel = settingsRoutes[pathname];
    if (subLabel) {
      return [
        { label: "Settings", href: "/settings/profile" },
        { label: subLabel },
      ];
    }
  }

  // Top-level routes
  const routeMap: Record<string, Breadcrumb[]> = {
    "/dashboard": [{ label: "Dashboard" }],
    "/jobs": [{ label: "Jobs" }],
    "/candidates": [{ label: "Candidates" }],
  };

  return routeMap[pathname] || [{ label: "Dashboard" }];
}
