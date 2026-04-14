import {
  Sheet,
  SheetContent,
  SheetFooter,
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
import { useCreateJob, useUpdateJob } from "@/hooks/useJobs";
import type { Job, JobCreate, JobUpdate } from "@/types/job";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type JobDrawerView =
  | { mode: "create" }
  | { mode: "edit"; job: Job };

interface JobDrawerProps {
  view: JobDrawerView | null;
  onOpenChange: (open: boolean) => void;
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

const EMPTY_BULLETS = [""];

function emptyForm(): FormData {
  return {
    title: "",
    description: "<p></p>",
    location: "",
    employment_type: "full_time",
    responsibilities: [...EMPTY_BULLETS],
    requirements: [...EMPTY_BULLETS],
    nice_to_have: [...EMPTY_BULLETS],
    benefits: [...EMPTY_BULLETS],
    work_arrangement: "onsite",
    status: "open",
    category: "",
    skills_required: "",
    experience_level: "",
  };
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

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SectionRule() {
  return <div className="border-t border-dashed border-border" role="presentation" />;
}

function JobCreateForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const createMutation = useCreateJob();
  const [formData, setFormData] = useState<FormData>(() => emptyForm());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !htmlToPlainText(formData.description)) {
      toast.error("Title and description are required.");
      return;
    }

    const payload: JobCreate = {
      title: formData.title.trim(),
      description: sanitizeJobDescriptionHtml(formData.description),
      location: formData.location.trim() || undefined,
      category: formData.category.trim() || undefined,
      employment_type: formData.employment_type,
      work_arrangement: formData.work_arrangement,
      status: formData.status,
      responsibilities: clean(formData.responsibilities),
      requirements: clean(formData.requirements),
      nice_to_have: clean(formData.nice_to_have),
      benefits: clean(formData.benefits),
      skills_required: formData.skills_required.trim() || undefined,
      experience_level: formData.experience_level || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: (job) => {
        toast.success("Job created.");
        onClose();
        navigate(`/jobs/${job.id}`);
      },
      onError: () => {
        toast.error("Could not create job. Check your connection and try again.");
      },
    });
  };

  const pending = createMutation.isPending;
  const set = (patch: Partial<FormData>) =>
    setFormData((p) => ({ ...p, ...patch }));

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4">
        <SheetTitle className="text-base font-semibold text-foreground">Create job</SheetTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Add the role, description, and publishing options. Draft jobs stay internal until you set status to Open.
        </p>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-6">
          <Section title="Job info">
            <div className="space-y-2">
              <Label htmlFor="create-title">Job title *</Label>
              <Input
                id="create-title"
                value={formData.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Senior Frontend Engineer"
                required
                className="h-10"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-loc">Location</Label>
                <Input
                  id="create-loc"
                  value={formData.location}
                  onChange={(e) => set({ location: e.target.value })}
                  placeholder="e.g. Berlin · Remote EU"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-cat">Category</Label>
                <Input
                  id="create-cat"
                  value={formData.category}
                  onChange={(e) => set({ category: e.target.value })}
                  placeholder="e.g. Engineering"
                  className="h-10"
                />
              </div>
            </div>
          </Section>

          <SectionRule />

          <Section title="Description">
            <div className="space-y-2">
              <Label htmlFor="create-desc">Full description *</Label>
              <JobDescriptionEditor
                id="create-desc"
                defaultContent={formData.description}
                onChange={(html) => set({ description: html })}
                placeholder="What the role is about, team context, and what success looks like…"
              />
            </div>
          </Section>

          <SectionRule />

          <Section title="Role details">
            <BulletListEditor
              id="create-resp"
              label="Responsibilities"
              items={formData.responsibilities}
              onChange={(items) => set({ responsibilities: items })}
              placeholder="e.g. Lead the design system roadmap"
            />
            <BulletListEditor
              id="create-req"
              label="Requirements"
              items={formData.requirements}
              onChange={(items) => set({ requirements: items })}
              placeholder="e.g. 5+ years with React and TypeScript"
            />
            <BulletListEditor
              id="create-nice"
              label="Nice to have"
              items={formData.nice_to_have}
              onChange={(items) => set({ nice_to_have: items })}
              placeholder="e.g. Experience with design tokens"
            />
            <BulletListEditor
              id="create-ben"
              label="Benefits"
              items={formData.benefits}
              onChange={(items) => set({ benefits: items })}
              placeholder="e.g. Learning budget, health coverage"
            />
          </Section>

          <SectionRule />

          <Section title="Matching & skills">
            <div className="space-y-2">
              <Label htmlFor="create-skills">Skills summary (optional)</Label>
              <Textarea
                id="create-skills"
                value={formData.skills_required}
                onChange={(e) => set({ skills_required: e.target.value })}
                placeholder="e.g. Python, PostgreSQL, AWS — comma or line separated"
                className="min-h-[88px] resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-exp">Experience level</Label>
              <Select
                value={formData.experience_level || "none"}
                onValueChange={(v) => set({ experience_level: v === "none" ? "" : v })}
              >
                <SelectTrigger id="create-exp" className="h-10 w-full sm:max-w-md">
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
          </Section>

          <SectionRule />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="create-et">Employment type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(v) => set({ employment_type: v })}
              >
                <SelectTrigger id="create-et" className="h-10 w-full">
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
              <Label htmlFor="create-wa">Work arrangement</Label>
              <Select
                value={formData.work_arrangement}
                onValueChange={(v) => set({ work_arrangement: v })}
              >
                <SelectTrigger id="create-wa" className="h-10 w-full">
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
            <div className="space-y-2">
              <Label htmlFor="create-status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger id="create-status" className="h-10 w-full">
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
        </div>
      </div>

      <SheetFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t border-border bg-popover px-5 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="min-w-[120px] bg-foreground text-background hover:bg-foreground/90"
        >
          {pending ? "Creating…" : "Create job"}
        </Button>
      </SheetFooter>
    </form>
  );
}

function JobEditForm({ job, onClose }: { job: Job; onClose: () => void }) {
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
      toast.success("Job updated.");
      onClose();
    } catch (error) {
      console.error("Error saving job:", error);
      toast.error("Could not save changes.");
    }
  };

  const isLoading = updateJobMutation.isPending;
  const set = (patch: Partial<FormData>) =>
    setFormData((p) => ({ ...p, ...patch }));

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4">
        <SheetTitle className="text-base font-semibold text-foreground">Edit job</SheetTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Update how this role appears on your career page and in matching.
        </p>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-6">
          <Section title="Job info">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Job title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Senior Software Engineer"
                required
                className="h-10"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-loc">Location</Label>
                <Input
                  id="edit-loc"
                  value={formData.location}
                  onChange={(e) => set({ location: e.target.value })}
                  placeholder="San Francisco, CA"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cat">Category</Label>
                <Input
                  id="edit-cat"
                  value={formData.category}
                  onChange={(e) => set({ category: e.target.value })}
                  placeholder="e.g. Engineering, Marketing"
                  className="h-10"
                />
              </div>
            </div>
          </Section>

          <SectionRule />

          <Section title="Description">
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Full description *</Label>
              <JobDescriptionEditor
                id="edit-desc"
                key={job.id}
                defaultContent={formData.description}
                onChange={(html) => set({ description: html })}
                placeholder="Brief overview of the role…"
              />
            </div>
          </Section>

          <SectionRule />

          <Section title="Role details">
            <BulletListEditor
              id="edit-resp"
              label="Responsibilities"
              items={formData.responsibilities}
              onChange={(items) => set({ responsibilities: items })}
              placeholder="e.g. Design and build APIs"
            />
            <BulletListEditor
              id="edit-req"
              label="Requirements"
              items={formData.requirements}
              onChange={(items) => set({ requirements: items })}
              placeholder="e.g. 3+ years of experience with Python"
            />
            <BulletListEditor
              id="edit-nice"
              label="Nice to have"
              items={formData.nice_to_have}
              onChange={(items) => set({ nice_to_have: items })}
              placeholder="e.g. Experience with Kubernetes"
            />
            <BulletListEditor
              id="edit-ben"
              label="Benefits"
              items={formData.benefits}
              onChange={(items) => set({ benefits: items })}
              placeholder="e.g. Health insurance, stock options"
            />
          </Section>

          <SectionRule />

          <Section title="Matching & skills">
            <div className="space-y-2">
              <Label htmlFor="edit-skills">Skills summary (optional)</Label>
              <Textarea
                id="edit-skills"
                value={formData.skills_required}
                onChange={(e) => set({ skills_required: e.target.value })}
                placeholder="Comma or line-separated skills for matching"
                className="min-h-[88px] resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-exp">Experience level</Label>
              <Select
                value={formData.experience_level || "none"}
                onValueChange={(v) => set({ experience_level: v === "none" ? "" : v })}
              >
                <SelectTrigger id="edit-exp" className="h-10 w-full sm:max-w-md">
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
          </Section>

          <SectionRule />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-et">Employment type</Label>
              <Select value={formData.employment_type} onValueChange={(v) => set({ employment_type: v })}>
                <SelectTrigger id="edit-et" className="h-10 w-full">
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
              <Label htmlFor="edit-wa">Work arrangement</Label>
              <Select value={formData.work_arrangement} onValueChange={(v) => set({ work_arrangement: v })}>
                <SelectTrigger id="edit-wa" className="h-10 w-full">
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
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger id="edit-status" className="h-10 w-full">
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
        </div>
      </div>

      <SheetFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t border-border bg-popover px-5 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="min-w-[120px] bg-foreground text-background hover:bg-foreground/90"
        >
          {isLoading ? "Saving…" : "Save changes"}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function JobDrawer({ view, onOpenChange }: JobDrawerProps) {
  const open = view !== null;
  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton
        className="flex h-full max-h-[100dvh] flex-col gap-0 overflow-hidden border-l p-0 data-[side=right]:w-full data-[side=right]:max-w-2xl data-[side=right]:sm:max-w-4xl data-[side=right]:lg:max-w-5xl"
      >
        {view?.mode === "create" ? (
          <JobCreateForm key="create" onClose={handleClose} />
        ) : view?.mode === "edit" ? (
          <JobEditForm key={view.job.id} job={view.job} onClose={handleClose} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
