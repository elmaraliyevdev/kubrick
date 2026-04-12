import { JobDrawer } from "@/components/JobDrawer";
import { JobsDataTable } from "@/components/JobsDataTable";
import { useJobs } from "@/hooks/useJobs";
import type { Job } from "@/types/job";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Jobs() {
  const navigate = useNavigate();
  const { data: jobs = [], isLoading, error } = useJobs();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleCreateJob = () => {
    navigate("/jobs/new");
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setDrawerOpen(true);
  };

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-medium text-gray-900">Jobs</h1>
        <p className="mt-4 text-sm text-red-600">Error loading jobs. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-4">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-foreground">Jobs</h1>
      </div>

      <JobsDataTable
        data={jobs}
        isLoading={isLoading}
        onCreateJob={handleCreateJob}
        onEditJob={handleEditJob}
      />

      <JobDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedJob(null);
        }}
        job={selectedJob}
      />
    </div>
  );
}
