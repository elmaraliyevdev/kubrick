import { CandidateDrawer } from "@/components/CandidateDrawer";
import { CandidateJobMatches } from "@/components/CandidateJobMatches";
import { ResumeUpload } from "@/components/ResumeUpload";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCandidate } from "@/hooks/useCandidates";
import type { Candidate } from "@/types/candidate";
import type { BulkUploadResult, UploadResult } from "@/types/upload";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type CandidateTab = "profile" | "experience" | "education" | "resume" | "matches";

export default function CandidateDetail() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = parseInt(candidateId || "0", 10);
  const { data: candidate, isLoading, error } = useCandidate(id);
  const [activeTab, setActiveTab] = useState<CandidateTab>("profile");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFullName = (c: Candidate) => {
    const parts = [c.first_name, c.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "No name provided";
  };

  const handleResumeUpload = (results: UploadResult | BulkUploadResult) => {
    console.log("Upload results:", results);
    queryClient.invalidateQueries({ queryKey: ["candidates", id] });
    toast.success("Resume uploaded and parsed successfully!");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-6">
        <div className="space-y-4 text-center">
          <h1 className="text-lg font-medium text-foreground">Candidate Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The candidate you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view them.
          </p>
          <Button type="button" onClick={() => navigate("/candidates")}>
            Go to Candidates
          </Button>
        </div>
      </div>
    );
  }

  const tabItems: { value: CandidateTab; label: string }[] = [
    { value: "profile", label: "Profile" },
    { value: "experience", label: "Experience" },
    { value: "education", label: "Education" },
    { value: "resume", label: "Resume" },
    { value: "matches", label: "Job matches" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-6 pb-6">
      <div className="mb-6 shrink-0 px-6">
        <SegmentedTabs<CandidateTab>
          variant="minimal"
          value={activeTab}
          onValueChange={setActiveTab}
          items={tabItems}
        />
      </div>

      {activeTab === "profile" && (
        <div className="space-y-6 px-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-border/80 bg-muted/30 pb-6">
              <div className="min-w-0 space-y-2">
                <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                  {getFullName(candidate)}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {candidate.latest_application_status ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                      {candidate.latest_application_status}
                    </span>
                  ) : null}
                  {candidate.location ? <span>{candidate.location}</span> : null}
                  <span>Added {formatDate(candidate.created_at)}</span>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                Edit candidate
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact
                </h2>
                <div className="space-y-2 text-sm">
                  {candidate.email ? (
                    <p>
                      <span className="text-muted-foreground">Email: </span>
                      <a href={`mailto:${candidate.email}`} className="text-primary underline-offset-4 hover:underline">
                        {candidate.email}
                      </a>
                    </p>
                  ) : null}
                  {candidate.phone ? (
                    <p>
                      <span className="text-muted-foreground">Phone: </span>
                      <a href={`tel:${candidate.phone}`} className="text-primary underline-offset-4 hover:underline">
                        {candidate.phone}
                      </a>
                    </p>
                  ) : null}
                  {candidate.linkedin_url ? (
                    <p>
                      <span className="text-muted-foreground">LinkedIn: </span>
                      <a
                        href={candidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Profile
                      </a>
                    </p>
                  ) : null}
                  {candidate.portfolio_url ? (
                    <p>
                      <span className="text-muted-foreground">Portfolio: </span>
                      <a
                        href={candidate.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Website
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
                <span>
                  {candidate.experience_years
                    ? `${candidate.experience_years} years experience`
                    : "Experience not specified"}
                </span>
                <span>{candidate.skills?.length ?? 0} skills</span>
                <span>{candidate.resume_files_count} resume(s)</span>
              </div>

              {candidate.skills && candidate.skills.length > 0 ? (
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {candidate.notes ? (
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{candidate.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "experience" && (
        <div className="space-y-4 px-6">
          {candidate.work_experiences && candidate.work_experiences.length > 0 ? (
            candidate.work_experiences.map((exp, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg leading-snug">
                    {exp.job_title || "Position"}
                  </CardTitle>
                  <CardDescription className="space-y-0.5">
                    <span className="block text-foreground/90">{exp.company_name || "Company"}</span>
                    {(exp.location || exp.duration) && (
                      <span className="block">
                        {[exp.location, exp.duration].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exp.employment_type ? (
                    <Badge variant="secondary" className="w-fit capitalize">
                      {exp.employment_type}
                    </Badge>
                  ) : null}
                  {exp.description ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {exp.description}
                    </p>
                  ) : null}
                  {exp.responsibilities ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground">Responsibilities</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {exp.responsibilities}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyTabMessage message="No work experience on file." />
          )}
        </div>
      )}

      {activeTab === "education" && (
        <div className="space-y-6 px-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {candidate.education && candidate.education.length > 0 ? (
                candidate.education.map((edu, index) => (
                  <div key={index} className="border-l-2 border-border pl-4">
                    <p className="text-sm font-medium text-foreground">{edu.degree || "Degree"}</p>
                    <p className="text-sm text-muted-foreground">{edu.school || "Institution"}</p>
                    {edu.year ? <p className="text-xs text-muted-foreground">{edu.year}</p> : null}
                    {edu.field ? <p className="text-xs text-muted-foreground">{edu.field}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No education on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {candidate.certifications && candidate.certifications.length > 0 ? (
                candidate.certifications.map((cert, index) => (
                  <div key={index} className="border-l-2 border-border pl-4">
                    <p className="text-sm font-medium text-foreground">{cert.name || "Certification"}</p>
                    <p className="text-sm text-muted-foreground">{cert.issuer || "Issuer"}</p>
                    {cert.year ? <p className="text-xs text-muted-foreground">Issued: {cert.year}</p> : null}
                    {cert.expiry ? <p className="text-xs text-muted-foreground">Expires: {cert.expiry}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No certifications on file.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "resume" && (
        <div className="px-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Resume</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ResumeUpload candidateId={candidate.id} onUploadComplete={handleResumeUpload} allowBulk={false} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "matches" && (
        <div className="px-6">
          <CandidateJobMatches candidateId={id} limit={10} />
        </div>
      )}

      <CandidateDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["candidates", id] });
          }
        }}
        candidate={candidate}
        mode="edit"
      />
    </div>
  );
}

function EmptyTabMessage({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
