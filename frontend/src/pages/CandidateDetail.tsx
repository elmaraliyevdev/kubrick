import { CandidateDrawer } from "@/components/CandidateDrawer";
import { CandidateJobMatches } from "@/components/CandidateJobMatches";
import { ResumeUpload } from "@/components/ResumeUpload";
import { useCandidate } from "@/hooks/useCandidates";
import type { Candidate } from "@/types/candidate";
import type { BulkUploadResult, UploadResult } from "@/types/upload";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function CandidateDetail() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: candidate, isLoading, error } = useCandidate(parseInt(candidateId || "0"));
  const [activeTab, setActiveTab] = useState<"profile" | "matches" | "resume">("profile");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFullName = (candidate: Candidate) => {
    const parts = [candidate.first_name, candidate.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "No name provided";
  };

  const handleResumeUpload = (results: UploadResult | BulkUploadResult) => {
    console.log("Upload results:", results);
    queryClient.invalidateQueries({ queryKey: ["candidates", parseInt(candidateId || "0")] });
    toast.success("Resume uploaded and parsed successfully!");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/4"></div>
          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-6">
        <div className="text-center space-y-4">
          <h1 className="text-lg font-medium text-gray-900">Candidate Not Found</h1>
          <p className="text-sm text-gray-500">
            The candidate you're looking for doesn't exist or you don't have permission to view them.
          </p>
          <button
            onClick={() => navigate("/candidates")}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800"
          >
            Go to Candidates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Link to="/candidates" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to candidates
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{getFullName(candidate)}</h1>
          <div className="flex items-center gap-3 mt-1">
            {candidate.latest_application_status && (
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs capitalize">
                {candidate.latest_application_status}
              </span>
            )}
            {candidate.location && (
              <span className="text-sm text-gray-500">{candidate.location}</span>
            )}
            <span className="text-sm text-gray-500">Added {formatDate(candidate.created_at)}</span>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50"
        >
          Edit Candidate
        </button>
      </div>

      {/* Contact info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-2">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Contact</h2>
        {candidate.email && (
          <p className="text-sm">
            <span className="text-gray-500">Email: </span>
            <a href={`mailto:${candidate.email}`} className="text-blue-500 hover:underline">
              {candidate.email}
            </a>
          </p>
        )}
        {candidate.phone && (
          <p className="text-sm">
            <span className="text-gray-500">Phone: </span>
            <a href={`tel:${candidate.phone}`} className="text-blue-500 hover:underline">
              {candidate.phone}
            </a>
          </p>
        )}
        {candidate.linkedin_url && (
          <p className="text-sm">
            <span className="text-gray-500">LinkedIn: </span>
            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Profile
            </a>
          </p>
        )}
        {candidate.portfolio_url && (
          <p className="text-sm">
            <span className="text-gray-500">Portfolio: </span>
            <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Website
            </a>
          </p>
        )}
        <div className="pt-2 flex gap-4 text-sm text-gray-500">
          <span>{candidate.experience_years ? `${candidate.experience_years} years exp.` : "Experience not specified"}</span>
          <span>{candidate.skills?.length || 0} skills</span>
          <span>{candidate.resume_files_count} resume(s)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-2 text-sm ${
            activeTab === "profile"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`pb-2 text-sm ${
            activeTab === "matches"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Job Matches
        </button>
        <button
          onClick={() => setActiveTab("resume")}
          className={`pb-2 text-sm ${
            activeTab === "resume"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Resume
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Work Experience */}
          {candidate.work_experiences && candidate.work_experiences.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Work Experience</h2>
              <div className="space-y-6">
                {candidate.work_experiences.map((exp, index) => (
                  <div key={index} className="border-l-2 border-gray-200 pl-4">
                    <p className="text-sm font-medium text-gray-900">{exp.job_title || "Position"}</p>
                    <p className="text-sm text-gray-700">{exp.company_name || "Company"}</p>
                    {exp.location && <p className="text-xs text-gray-500">{exp.location}</p>}
                    {exp.duration && <p className="text-xs text-gray-500">{exp.duration}</p>}
                    {exp.employment_type && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                        {exp.employment_type}
                      </span>
                    )}
                    {exp.description && (
                      <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{exp.description}</p>
                    )}
                    {exp.responsibilities && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Responsibilities:</p>
                        <p className="text-sm text-gray-500 whitespace-pre-line">{exp.responsibilities}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {candidate.education && candidate.education.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Education</h2>
              <div className="space-y-3">
                {candidate.education.map((edu, index) => (
                  <div key={index} className="border-l-2 border-gray-200 pl-4">
                    <p className="text-sm font-medium text-gray-900">{edu.degree || "Degree"}</p>
                    <p className="text-sm text-gray-500">{edu.school || "Institution"}</p>
                    {edu.year && <p className="text-xs text-gray-500">{edu.year}</p>}
                    {edu.field && <p className="text-xs text-gray-500">{edu.field}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {candidate.certifications && candidate.certifications.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Certifications</h2>
              <div className="space-y-3">
                {candidate.certifications.map((cert, index) => (
                  <div key={index} className="border-l-2 border-gray-200 pl-4">
                    <p className="text-sm font-medium text-gray-900">{cert.name || "Certification"}</p>
                    <p className="text-sm text-gray-500">{cert.issuer || "Issuer"}</p>
                    {cert.year && <p className="text-xs text-gray-500">Issued: {cert.year}</p>}
                    {cert.expiry && <p className="text-xs text-gray-500">Expires: {cert.expiry}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {candidate.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "matches" && (
        <CandidateJobMatches candidateId={parseInt(candidateId || "0")} limit={10} />
      )}

      {activeTab === "resume" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Resume Upload</h2>
          <ResumeUpload
            candidateId={candidate.id}
            onUploadComplete={handleResumeUpload}
            allowBulk={false}
          />
        </div>
      )}

      <CandidateDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["candidates", parseInt(candidateId || "0")] });
          }
        }}
        candidate={candidate}
        mode="edit"
      />
    </div>
  );
}
