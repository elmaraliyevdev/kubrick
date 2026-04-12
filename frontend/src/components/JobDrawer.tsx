import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BulletListEditor } from "@/components/job-form/BulletListEditor";
import { JobDescriptionEditor } from "@/components/job-form/JobDescriptionEditor";
import { htmlToPlainText, sanitizeJobDescriptionHtml } from "@/utils/jobDescriptionHtml";
import { useUpdateJob } from "@/hooks/useJobs";
import type { Job, JobUpdate } from "@/types/job";
import { useState } from "react";

interface JobDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
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
  skills_required: string;
  experience_level: string;
}

function jobToForm(job: Job): FormData {
  return {
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
    skills_required: job.skills_required || "",
    experience_level: job.experience_level || "",
  };
}

function clean(arr: string[]) {
  return arr.map((s) => s.trim()).filter(Boolean);
}

function JobEditForm({
  job,
  onClose,
}: {
  job: Job;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<FormData>(() => jobToForm(job));
  const updateJobMutation = useUpdateJob();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !htmlToPlainText(formData.description)) {
      return;
    }

    const payload: JobUpdate = {
      title: formData.title.trim(),
      description: sanitizeJobDescriptionHtml(formData.description),
      location: formData.location || undefined,
      employment_type: formData.employment_type,
      responsibilities: clean(formData.responsibilities),
      requirements: clean(formData.requirements),
      nice_to_have: clean(formData.nice_to_have),
      benefits: clean(formData.benefits),
      work_arrangement: formData.work_arrangement,
      status: formData.status,
      category: formData.category || undefined,
      skills_required: formData.skills_required.trim() || undefined,
      experience_level: formData.experience_level || null,
    };

    try {
      await updateJobMutation.mutateAsync({ id: job.id, data: payload });
      onClose();
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };

  const isLoading = updateJobMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <SheetHeader>
        <SheetTitle className="text-lg font-medium text-foreground">Edit job</SheetTitle>
      </SheetHeader>

      <div className="space-y-5 py-6">
        <div className="space-y-2">
          <Label htmlFor="drawer-title">Job title *</Label>
          <Input
            id="drawer-title"
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="Senior Software Engineer"
            required
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawer-desc">Description *</Label>
          <JobDescriptionEditor
            id="drawer-desc"
            key={job.id}
            defaultContent={formData.description}
            onChange={(html) => setFormData((p) => ({ ...p, description: html }))}
            placeholder="Brief overview of the role…"
          />
        </div>

        <BulletListEditor
          id="drawer-resp"
          label="Responsibilities"
          items={formData.responsibilities}
          onChange={(items) => setFormData((p) => ({ ...p, responsibilities: items }))}
          placeholder="e.g. Design and build APIs"
        />

        <BulletListEditor
          id="drawer-req"
          label="Requirements"
          items={formData.requirements}
          onChange={(items) => setFormData((p) => ({ ...p, requirements: items }))}
          placeholder="e.g. 3+ years of experience with Python"
        />

        <BulletListEditor
          id="drawer-nice"
          label="Nice to have"
          items={formData.nice_to_have}
          onChange={(items) => setFormData((p) => ({ ...p, nice_to_have: items }))}
          placeholder="e.g. Experience with Kubernetes"
        />

        <BulletListEditor
          id="drawer-ben"
          label="Benefits"
          items={formData.benefits}
          onChange={(items) => setFormData((p) => ({ ...p, benefits: items }))}
          placeholder="e.g. Health insurance, stock options"
        />

        <div className="space-y-2">
          <Label htmlFor="drawer-skills">Skills summary (optional)</Label>
          <Textarea
            id="drawer-skills"
            value={formData.skills_required}
            onChange={(e) => setFormData((p) => ({ ...p, skills_required: e.target.value }))}
            placeholder="Comma or line-separated skills for matching"
            className="min-h-[72px] resize-y text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawer-exp">Experience level</Label>
          <Select
            value={formData.experience_level || "none"}
            onValueChange={(v) =>
              setFormData((p) => ({ ...p, experience_level: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger id="drawer-exp" className="h-9">
              <SelectValue placeholder="Not specified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawer-loc">Location</Label>
          <Input
            id="drawer-loc"
            value={formData.location}
            onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
            placeholder="San Francisco, CA"
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawer-cat">Category</Label>
          <Input
            id="drawer-cat"
            value={formData.category}
            onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
            placeholder="e.g. Engineering, Marketing"
            className="h-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="drawer-et">Employment type</Label>
            <Select
              value={formData.employment_type}
              onValueChange={(v) => setFormData((p) => ({ ...p, employment_type: v }))}
            >
              <SelectTrigger id="drawer-et" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full time</SelectItem>
                <SelectItem value="part_time">Part time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drawer-wa">Work arrangement</Label>
            <Select
              value={formData.work_arrangement}
              onValueChange={(v) => setFormData((p) => ({ ...p, work_arrangement: v }))}
            >
              <SelectTrigger id="drawer-wa" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote_only">Remote only</SelectItem>
                <SelectItem value="remote_possible">Remote possible</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
                <SelectItem value="relocation_required">Relocation required</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawer-status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
          >
            <SelectTrigger id="drawer-status" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function JobDrawer({ open, onOpenChange, job }: JobDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        {job ? <JobEditForm key={job.id} job={job} onClose={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}
