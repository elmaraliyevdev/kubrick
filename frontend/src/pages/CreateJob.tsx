import { BulletListEditor } from "@/components/job-form/BulletListEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { JobDescriptionEditor } from "@/components/job-form/JobDescriptionEditor";
import { useCreateJob } from "@/hooks/useJobs";
import type { JobCreate } from "@/types/job";
import { htmlToPlainText, sanitizeJobDescriptionHtml } from "@/utils/jobDescriptionHtml";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

function cleanBullets(arr: string[]) {
  return arr.map((s) => s.trim()).filter(Boolean);
}

const EMPTY_BULLETS = [""];

export default function CreateJob() {
  const navigate = useNavigate();
  const createMutation = useCreateJob();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("<p></p>");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [workArrangement, setWorkArrangement] = useState("onsite");
  const [status, setStatus] = useState("open");
  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [skillsRequired, setSkillsRequired] = useState("");
  const [responsibilities, setResponsibilities] = useState<string[]>(EMPTY_BULLETS);
  const [requirements, setRequirements] = useState<string[]>(EMPTY_BULLETS);
  const [niceToHave, setNiceToHave] = useState<string[]>(EMPTY_BULLETS);
  const [benefits, setBenefits] = useState<string[]>(EMPTY_BULLETS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !htmlToPlainText(description)) {
      toast.error("Title and description are required.");
      return;
    }

    const payload: JobCreate = {
      title: title.trim(),
      description: sanitizeJobDescriptionHtml(description),
      location: location.trim() || undefined,
      category: category.trim() || undefined,
      employment_type: employmentType,
      work_arrangement: workArrangement,
      status,
      responsibilities: cleanBullets(responsibilities),
      requirements: cleanBullets(requirements),
      nice_to_have: cleanBullets(niceToHave),
      benefits: cleanBullets(benefits),
      skills_required: skillsRequired.trim() || undefined,
      experience_level: experienceLevel || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: (job) => {
        toast.success("Job created.");
        navigate(`/jobs/${job.id}`);
      },
      onError: () => {
        toast.error("Could not create job. Check your connection and try again.");
      },
    });
  };

  const pending = createMutation.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-auto">
        <div className="px-4 py-4 lg:px-6 lg:py-5 pb-10">
          <div className="w-full max-w-2xl space-y-6">
            <Card>
              <CardHeader className="gap-2">
                <div>
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    Back to jobs
                  </Link>
                </div>
                <CardTitle className="text-xl font-semibold tracking-tight">Create job</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Basics and work setup are structured; the description is rich HTML; bullets and skills power the career
                  page and matching.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basics</CardTitle>
                <CardDescription>Title, location, and how the role is categorized.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Berlin · Remote EU"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Engineering, Design"
                    className="h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
                <CardDescription>
                  Rich text for the public posting—headings, bold, lists, and links (like Lever / Greenhouse). Stored as
                  safe HTML.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="description">Full description *</Label>
                  <JobDescriptionEditor
                    id="description"
                    defaultContent={description}
                    onChange={setDescription}
                    placeholder="What the role is about, team context, and what success looks like…"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Role details</CardTitle>
                <CardDescription>Structured bullets for your career page and job detail tabs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <BulletListEditor
                  id="resp"
                  label="Responsibilities"
                  items={responsibilities}
                  onChange={setResponsibilities}
                  placeholder="e.g. Lead the design system roadmap"
                />
                <BulletListEditor
                  id="req"
                  label="Requirements"
                  items={requirements}
                  onChange={setRequirements}
                  placeholder="e.g. 5+ years with React and TypeScript"
                />
                <BulletListEditor
                  id="nice"
                  label="Nice to have"
                  items={niceToHave}
                  onChange={setNiceToHave}
                  placeholder="e.g. Experience with design tokens"
                />
                <BulletListEditor
                  id="ben"
                  label="Benefits"
                  items={benefits}
                  onChange={setBenefits}
                  placeholder="e.g. Learning budget, health coverage"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matching & skills</CardTitle>
                <CardDescription>
                  Optional free-text skills line used by the matcher when bullet lists are not parsed yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skills_required">Skills summary (optional)</Label>
                  <Textarea
                    id="skills_required"
                    value={skillsRequired}
                    onChange={(e) => setSkillsRequired(e.target.value)}
                    placeholder="e.g. Python, PostgreSQL, AWS — comma or line separated"
                    className="min-h-[88px] resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience_level">Experience level</Label>
                  <Select value={experienceLevel || "none"} onValueChange={(v) => setExperienceLevel(v === "none" ? "" : v)}>
                    <SelectTrigger id="experience_level" className="h-10 w-full max-w-md">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Work setup</CardTitle>
                <CardDescription>Employment type and where work happens.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employment_type">Employment type</Label>
                  <Select value={employmentType} onValueChange={setEmploymentType}>
                    <SelectTrigger id="employment_type" className="h-10">
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
                  <Label htmlFor="work_arrangement">Work arrangement</Label>
                  <Select value={workArrangement} onValueChange={setWorkArrangement}>
                    <SelectTrigger id="work_arrangement" className="h-10">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publishing</CardTitle>
                <CardDescription>Draft jobs are not listed on the public career page until set to Open.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild disabled={pending}>
                <Link to="/jobs">Cancel</Link>
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create job"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
