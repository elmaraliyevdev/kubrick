import { useJob } from "@/hooks/useJobs";
import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

export function PageTitle() {
  const location = useLocation();
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job } = useJob(parseInt(jobId || "0"));

  useEffect(() => {
    let title = "Kubrick";

    if (location.pathname.startsWith("/jobs/") && jobId) {
      title = job?.title ? `${job.title} | Kubrick` : "Job Details | Kubrick";
    } else {
      const routeTitles: Record<string, string> = {
        "/dashboard": "Dashboard | Kubrick",
        "/jobs": "Jobs | Kubrick",
        "/candidates": "Candidates | Kubrick",
        "/analytics": "Analytics | Kubrick",
        "/settings": "Settings | Kubrick",
      };
      title = routeTitles[location.pathname] || "Kubrick";
    }

    document.title = title;
  }, [location.pathname, job?.title, jobId]);

  return null;
}
