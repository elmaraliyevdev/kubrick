import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useCareerJobDetail, useApplyToJob } from "@/hooks/useCareers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const WORK_ARRANGEMENTS: Record<string, string> = {
  remote_only: "Remote Only",
  remote_possible: "Remote Possible",
  hybrid: "Hybrid",
  onsite: "Onsite",
  relocation_required: "Relocation Required",
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
};

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface CareerJobDetailProps {
  orgSlug?: string;
}

export default function CareerJobDetail({ orgSlug: propSlug }: CareerJobDetailProps) {
  const { orgSlug: paramOrgSlug, jobSlug } = useParams<{
    orgSlug: string;
    jobSlug: string;
  }>();
  const orgSlug = propSlug || paramOrgSlug;
  const { data: job, isLoading, error } = useCareerJobDetail(orgSlug || "", jobSlug || "");
  const applyMutation = useApplyToJob();

  const [submitted, setSubmitted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const applicationRef = useRef<HTMLDivElement>(null);

  const scrollToApplication = () => {
    applicationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgSlug || !jobSlug) return;

    const form = e.currentTarget;
    const formElements = form.elements as HTMLFormControlsCollection;

    if (!selectedFile) {
      toast.error("Please upload your resume");
      return;
    }

    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size: 10MB");
      return;
    }

    const formData = new FormData();
    formData.append("first_name", (formElements.namedItem("first_name") as HTMLInputElement).value);
    formData.append("last_name", (formElements.namedItem("last_name") as HTMLInputElement).value);
    formData.append("email", (formElements.namedItem("email") as HTMLInputElement).value);

    const phone = (formElements.namedItem("phone") as HTMLInputElement).value;
    if (phone) formData.append("phone", phone);
    const location = (formElements.namedItem("location") as HTMLInputElement).value;
    if (location) formData.append("location", location);
    const linkedin = (formElements.namedItem("linkedin_url") as HTMLInputElement).value;
    if (linkedin) formData.append("linkedin_url", linkedin);
    const portfolio = (formElements.namedItem("portfolio_url") as HTMLInputElement).value;
    if (portfolio) formData.append("portfolio_url", portfolio);
    const coverLetter = (formElements.namedItem("cover_letter") as HTMLTextAreaElement).value;
    if (coverLetter) formData.append("cover_letter", coverLetter);

    formData.append("resume", selectedFile);

    applyMutation.mutate(
      { orgSlug, jobSlug, formData },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err: unknown) => {
          const ax = err as { response?: { status?: number; data?: { detail?: string } } };
          if (ax.response?.status === 409) {
            toast.error("You have already applied for this position");
          } else {
            toast.error(ax.response?.data?.detail || "Failed to submit application");
          }
        },
      }
    );
  };

  const backHref = propSlug ? "/" : `/${orgSlug}`;

  if (error) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-foreground mb-2">Job not found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          This job posting may have been closed or removed.
        </p>
        <Button variant="outline" asChild>
          <Link to={backHref} className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" aria-hidden />
            Back to all jobs
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="h-4 bg-muted rounded w-40 animate-pulse" />
        <div className="h-10 bg-muted rounded w-3/4 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 bg-muted rounded w-20 animate-pulse" />
          <div className="h-6 bg-muted rounded w-24 animate-pulse" />
        </div>
        <div className="h-64 bg-muted rounded w-full animate-pulse" />
        <div className="h-96 bg-muted rounded w-full animate-pulse" />
      </div>
    );
  }

  if (!job) return null;

  const bulletSection = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <section className="mb-10">
        <h2 className="text-base font-semibold text-foreground mb-3">{title}</h2>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
              <span
                className="text-primary mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/80"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const postedLabel = new Date(job.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl">
      <Link
        to={backHref}
        className={cn(
          "inline-flex items-center gap-2 text-sm font-medium text-muted-foreground",
          "hover:text-foreground transition-colors mb-8 group"
        )}
      >
        <ArrowLeft
          className="size-4 transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        />
        Back to all jobs
      </Link>

      {/* Title, tags, Apply — metadata that was in the old sidebar is folded into tags + posted line */}
      <header className="mb-10 pb-8 border-b border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground text-balance">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Badge variant="secondary" className="font-normal">
                {EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {WORK_ARRANGEMENTS[job.work_arrangement] || job.work_arrangement}
              </Badge>
              {job.location && (
                <Badge variant="outline" className="font-normal">
                  {job.location}
                </Badge>
              )}
              {job.category && (
                <Badge variant="outline" className="font-normal">
                  {job.category}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-3">Posted {postedLabel}</p>
          </div>
          {!submitted && (
            <Button
              type="button"
              size="lg"
              className="shrink-0 w-full sm:w-auto"
              onClick={scrollToApplication}
            >
              Apply for this role
            </Button>
          )}
        </div>
      </header>

      {/* Job body */}
      <section className="mb-12">
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
          {job.description}
        </div>
      </section>

      {bulletSection("Responsibilities", job.responsibilities)}
      {bulletSection("Requirements", job.requirements)}
      {bulletSection("Nice to have", job.nice_to_have)}
      {bulletSection("Benefits", job.benefits)}

      {/* Application — bottom */}
      <div ref={applicationRef} id="apply" className="scroll-mt-24 pt-4">
        {submitted ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Application received</CardTitle>
              <CardDescription>
                Thank you for applying. We&apos;ll review your application and get back to you soon.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Apply for this position</CardTitle>
              <CardDescription>
                Submit your details and resume. Fields marked * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First name *</Label>
                    <Input id="first_name" name="first_name" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last name *</Label>
                    <Input id="last_name" name="last_name" required className="h-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    className="h-10"
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio URL</Label>
                  <Input
                    id="portfolio_url"
                    name="portfolio_url"
                    className="h-10"
                    placeholder="https://…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resume">Resume *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="resume"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal h-auto min-h-10 py-2 px-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile
                      ? selectedFile.name
                      : "Choose file — PDF, DOCX, DOC, or TXT (max 10MB)"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cover_letter">Cover letter</Label>
                  <Textarea
                    id="cover_letter"
                    name="cover_letter"
                    rows={5}
                    className="resize-y min-h-[120px]"
                    placeholder="Tell us why you’re a great fit…"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full sm:w-auto min-w-[200px]"
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? "Submitting…" : "Submit application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
