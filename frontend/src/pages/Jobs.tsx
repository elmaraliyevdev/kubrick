import { JobDrawer } from "@/components/JobDrawer";
import { JobsDataTable } from "@/components/JobsDataTable";
import { useJobs } from "@/hooks/useJobs";
import type { Job } from "@/types/job";
import { useState } from "react";

export default function Jobs() {
  const { data: jobs = [], isLoading, error } = useJobs();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");

  const handleCreateJob = () => {
    setSelectedJob(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setDrawerMode("edit");
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
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">Jobs</h1>
        <button
          onClick={handleCreateJob}
          className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800"
        >
          New job
        </button>
      </div>

      <JobsDataTable
        data={jobs}
        isLoading={isLoading}
        onCreateJob={handleCreateJob}
        onEditJob={handleEditJob}
      />

      <JobDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        job={selectedJob}
        mode={drawerMode}
      />
    </div>
  );
}
