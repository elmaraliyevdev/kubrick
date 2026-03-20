import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCreateJob, useUpdateJob } from "@/hooks/useJobs";
import type { Job, JobCreate, JobUpdate } from "@/types/job";
import { Plus, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface JobDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
  mode: "create" | "edit";
}

interface FormData {
  title: string;
  description: string;
  location: string;
  employment_type: string;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  benefits: string[];
  work_arrangement: string;
  status: string;
  category: string;
}

const EMPTY_FORM: FormData = {
  title: "",
  description: "",
  location: "",
  employment_type: "full_time",
  responsibilities: [""],
  requirements: [""],
  nice_to_have: [""],
  benefits: [""],
  work_arrangement: "onsite",
  status: "open",
  category: "",
};

function BulletList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const addItem = () => onChange([...items, ""]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };
  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1.5">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">•</span>
            <input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1 text-gray-300 hover:text-gray-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>
    </div>
  );
}

export function JobDrawer({ open, onOpenChange, job, mode }: JobDrawerProps) {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const createJobMutation = useCreateJob();
  const updateJobMutation = useUpdateJob();

  useEffect(() => {
    if (mode === "edit" && job) {
      setFormData({
        title: job.title,
        description: job.description,
        location: job.location || "",
        employment_type: job.employment_type,
        responsibilities: job.responsibilities?.length ? job.responsibilities : [""],
        requirements: job.requirements?.length ? job.requirements : [""],
        nice_to_have: job.nice_to_have?.length ? job.nice_to_have : [""],
        benefits: job.benefits?.length ? job.benefits : [""],
        work_arrangement: job.work_arrangement,
        status: job.status,
        category: job.category || "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [mode, job, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty bullet items
    const clean = (arr: string[]) => arr.filter((s) => s.trim());

    const payload: JobCreate = {
      title: formData.title,
      description: formData.description,
      location: formData.location || undefined,
      employment_type: formData.employment_type,
      responsibilities: clean(formData.responsibilities),
      requirements: clean(formData.requirements),
      nice_to_have: clean(formData.nice_to_have),
      benefits: clean(formData.benefits),
      work_arrangement: formData.work_arrangement,
      status: formData.status,
      category: formData.category || undefined,
    };

    try {
      if (mode === "create") {
        await createJobMutation.mutateAsync(payload);
      } else if (mode === "edit" && job) {
        await updateJobMutation.mutateAsync({
          id: job.id,
          data: payload as JobUpdate,
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

          <div className="space-y-5 py-6">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Job Title *
              </label>
              <input
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Senior Software Engineer"
                required
                className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Brief overview of the role..."
                className="w-full min-h-[100px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                required
              />
            </div>

            {/* 4 bullet sections */}
            <BulletList
              label="Responsibilities"
              items={formData.responsibilities}
              onChange={(items) =>
                setFormData((p) => ({ ...p, responsibilities: items }))
              }
              placeholder="e.g. Design and build APIs"
            />

            <BulletList
              label="Requirements"
              items={formData.requirements}
              onChange={(items) =>
                setFormData((p) => ({ ...p, requirements: items }))
              }
              placeholder="e.g. 3+ years of experience with Python"
            />

            <BulletList
              label="Nice to Have"
              items={formData.nice_to_have}
              onChange={(items) =>
                setFormData((p) => ({ ...p, nice_to_have: items }))
              }
              placeholder="e.g. Experience with Kubernetes"
            />

            <BulletList
              label="Benefits"
              items={formData.benefits}
              onChange={(items) =>
                setFormData((p) => ({ ...p, benefits: items }))
              }
              placeholder="e.g. Health insurance, stock options"
            />

            {/* Location */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Location
              </label>
              <input
                value={formData.location}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, location: e.target.value }))
                }
                placeholder="San Francisco, CA"
                className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Category
              </label>
              <input
                value={formData.category}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, category: e.target.value }))
                }
                placeholder="e.g. Engineering, Marketing"
                className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Dropdowns row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Employment Type
                </label>
                <select
                  value={formData.employment_type}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      employment_type: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Work Arrangement
                </label>
                <select
                  value={formData.work_arrangement}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      work_arrangement: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="remote_only">Remote Only</option>
                  <option value="remote_possible">Remote Possible</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                  <option value="relocation_required">
                    Relocation Required
                  </option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border border-gray-200 text-gray-700 rounded-lg h-9 px-4 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gray-900 text-white rounded-lg h-9 px-4 text-sm hover:bg-gray-800 disabled:opacity-50"
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
