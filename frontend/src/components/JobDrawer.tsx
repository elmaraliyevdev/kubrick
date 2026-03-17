import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCreateJob, useUpdateJob } from "@/hooks/useJobs";
import type { Job, JobCreate, JobUpdate } from "@/types/job";
import React, { useEffect, useState } from "react";

interface JobDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
  mode: "create" | "edit";
}

export function JobDrawer({ open, onOpenChange, job, mode }: JobDrawerProps) {
  const [formData, setFormData] = useState<JobCreate>({
    title: "",
    description: "",
    location: "",
    employment_type: "full_time",
    experience_level: "mid",
    salary_min: undefined,
    salary_max: undefined,
    skills_required: "",
    work_arrangement: "onsite",
    status: "open",
  });

  const createJobMutation = useCreateJob();
  const updateJobMutation = useUpdateJob();

  useEffect(() => {
    if (mode === "edit" && job) {
      setFormData({
        title: job.title,
        description: job.description,
        location: job.location || "",
        employment_type: job.employment_type,
        experience_level: job.experience_level,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        skills_required: job.skills_required,
        work_arrangement: job.work_arrangement,
        status: job.status,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        location: "",
        employment_type: "full_time",
        experience_level: "mid",
        salary_min: undefined,
        salary_max: undefined,
        skills_required: "",
        work_arrangement: "onsite",
        status: "open",
      });
    }
  }, [mode, job, open]);

  const handleInputChange = (field: keyof JobCreate, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === "create") {
        await createJobMutation.mutateAsync(formData);
      } else if (mode === "edit" && job) {
        await updateJobMutation.mutateAsync({
          id: job.id,
          data: formData as JobUpdate,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };

  const isLoading = createJobMutation.isPending || updateJobMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle className="text-lg font-medium text-gray-900">
              {mode === "create" ? "Create New Job" : "Edit Job"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div>
              <label htmlFor="title" className="block text-sm text-gray-700 mb-1.5">
                Job Title *
              </label>
              <input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Senior Software Engineer"
                required
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm text-gray-700 mb-1.5">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the role, responsibilities, and requirements..."
                className="w-full min-h-[120px] border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                required
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm text-gray-700 mb-1.5">
                Location
              </label>
              <input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="employment_type" className="block text-sm text-gray-700 mb-1.5">
                  Employment Type
                </label>
                <select
                  id="employment_type"
                  value={formData.employment_type}
                  onChange={(e) => handleInputChange("employment_type", e.target.value)}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label htmlFor="experience_level" className="block text-sm text-gray-700 mb-1.5">
                  Experience Level
                </label>
                <select
                  id="experience_level"
                  value={formData.experience_level}
                  onChange={(e) => handleInputChange("experience_level", e.target.value)}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="salary_min" className="block text-sm text-gray-700 mb-1.5">
                  Minimum Salary
                </label>
                <input
                  id="salary_min"
                  type="number"
                  value={formData.salary_min || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "salary_min",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="80000"
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="salary_max" className="block text-sm text-gray-700 mb-1.5">
                  Maximum Salary
                </label>
                <input
                  id="salary_max"
                  type="number"
                  value={formData.salary_max || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "salary_max",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="120000"
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="work_arrangement" className="block text-sm text-gray-700 mb-1.5">
                  Work Arrangement
                </label>
                <select
                  id="work_arrangement"
                  value={formData.work_arrangement}
                  onChange={(e) => handleInputChange("work_arrangement", e.target.value)}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="remote_only">Remote Only</option>
                  <option value="remote_possible">Remote Possible</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                  <option value="relocation_required">Relocation Required</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create Job"
                  : "Update Job"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
