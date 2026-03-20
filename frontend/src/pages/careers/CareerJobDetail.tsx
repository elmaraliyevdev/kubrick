import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useCareerJobDetail, useApplyToJob } from "@/hooks/useCareers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
  const { data: job, isLoading, error } = useCareerJobDetail(
    orgSlug || "",
    jobSlug || ""
  );
  const applyMutation = useApplyToJob();

  const [submitted, setSubmitted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgSlug || !jobSlug) return;

    const form = e.currentTarget;
    const formElements = form.elements as HTMLFormControlsCollection;

    if (!selectedFile) {
      toast.error("Please upload your resume");
      return;
    }

    // Validate file
    const ext = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();
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
        onError: (err: any) => {
          if (err.response?.status === 409) {
            toast.error("You have already applied for this position");
          } else {
            toast.error(
              err.response?.data?.detail || "Failed to submit application"
            );
          }
        },
      }
    );
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Job not found
        </h2>
        <p className="text-sm text-gray-500">
          This job posting may have been closed or removed.
        </p>
        <Link
          to={propSlug ? "/" : `/${orgSlug}`}
          className="text-sm text-blue-500 mt-4 inline-block hover:underline"
        >
          Back to all jobs
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="h-8 bg-gray-100 rounded w-64 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-96 animate-pulse" />
          <div className="h-64 bg-gray-100 rounded w-full animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-gray-100 rounded w-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!job) return null;

  const bulletSection = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <span className="text-gray-300 mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <Link
        to={propSlug ? "/" : `/${orgSlug}`}
        className="text-sm text-gray-500 hover:text-gray-900 mb-8 inline-block transition-colors"
      >
        Back to all jobs
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left column - Job details */}
        <div className="md:col-span-2">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-2 mb-8">
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
              {EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}
            </span>
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
              {WORK_ARRANGEMENTS[job.work_arrangement] || job.work_arrangement}
            </span>
            {job.location && (
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                {job.location}
              </span>
            )}
            {job.category && (
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                {job.category}
              </span>
            )}
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </p>
          </div>

          {bulletSection("Responsibilities", job.responsibilities)}
          {bulletSection("Requirements", job.requirements)}
          {bulletSection("Nice to Have", job.nice_to_have)}
          {bulletSection("Benefits", job.benefits)}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Job details card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Job Details
            </h3>
            <div className="space-y-3 text-sm text-gray-500">
              {job.location && <p>{job.location}</p>}
              <p>{EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}</p>
              <p>{WORK_ARRANGEMENTS[job.work_arrangement] || job.work_arrangement}</p>
              <p>
                Posted{" "}
                {new Date(job.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Application form */}
          {submitted ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Application Submitted
              </h3>
              <p className="text-sm text-gray-500">
                Thank you for applying. We'll review your application and get
                back to you soon.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Apply for this position
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="first_name" className="text-xs mb-1">
                    First Name *
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-xs mb-1">
                    Last Name *
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs mb-1">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs mb-1">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-xs mb-1">
                    Location
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin_url" className="text-xs mb-1">
                    LinkedIn URL
                  </Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    className="h-9 text-sm"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <Label htmlFor="portfolio_url" className="text-xs mb-1">
                    Portfolio URL
                  </Label>
                  <Input
                    id="portfolio_url"
                    name="portfolio_url"
                    className="h-9 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="resume" className="text-xs mb-1">
                    Resume *
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="resume"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                  />
                  <button
                    type="button"
                    className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm w-full text-left"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? selectedFile.name : "Upload resume"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOCX, DOC, or TXT (max 10MB)
                  </p>
                </div>
                <div>
                  <Label htmlFor="cover_letter" className="text-xs mb-1">
                    Cover Letter
                  </Label>
                  <Textarea
                    id="cover_letter"
                    name="cover_letter"
                    rows={4}
                    className="text-sm resize-none"
                    placeholder="Tell us why you're a great fit..."
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm w-full disabled:opacity-50"
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending
                    ? "Submitting..."
                    : "Submit Application"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
