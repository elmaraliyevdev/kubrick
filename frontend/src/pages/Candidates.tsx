import { BulkResumeUpload } from "@/components/BulkResumeUpload";
import { CandidateDrawer } from "@/components/CandidateDrawer";
import { CandidatesDataTable } from "@/components/CandidatesDataTable";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCandidates } from "@/hooks/useCandidates";
import type { CandidateListItem } from "@/types/candidate";
import type { BulkUploadResult, UploadResult } from "@/types/upload";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function Candidates() {
  const { data: candidates = [], isLoading, error } = useCandidates();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [singleUploadOpen, setSingleUploadOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateListItem | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");

  const queryClient = useQueryClient();

  const handleCreateCandidate = () => {
    setSelectedCandidate(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const handleEditCandidate = (candidate: CandidateListItem) => {
    setSelectedCandidate(candidate);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const handleSingleUploadComplete = (result: UploadResult) => {
    setSingleUploadOpen(false);

    // Refresh the candidates list
    queryClient.invalidateQueries({ queryKey: ["candidates"] });

    // Show success message with candidate info
    if ("candidate" in result) {
      const candidate = (result as any).candidate;
      toast.success(`Successfully created candidate ${candidate.first_name} ${candidate.last_name}!`);
    } else {
      toast.success("Resume uploaded successfully!");
    }
  };

  const handleBulkUploadComplete = (results: BulkUploadResult) => {
    setBulkUploadOpen(false);

    // Refresh the candidates list
    queryClient.invalidateQueries({ queryKey: ["candidates"] });

    // Show success/error messages with stats
    const successCount = results.results.filter((r) => r.success).length;
    const totalCount = results.results.length;
    const failedCount = totalCount - successCount;

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} of ${totalCount} resumes!`);
    }

    if (failedCount > 0) {
      toast.error(`Failed to upload ${failedCount} resume${failedCount > 1 ? "s" : ""}`);
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-medium text-gray-900">Candidates</h1>
        <p className="mt-4 text-sm text-red-600">Error loading candidates. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">Candidates</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSingleUploadOpen(true)}
            className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50"
          >
            Upload Resume
          </button>
          <button
            onClick={() => setBulkUploadOpen(true)}
            className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50"
          >
            Bulk Upload
          </button>
          <button
            onClick={handleCreateCandidate}
            className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm hover:bg-gray-800"
          >
            Add candidate
          </button>
        </div>
      </div>

      <CandidatesDataTable
        data={candidates}
        isLoading={isLoading}
        onCreateCandidate={handleCreateCandidate}
        onEditCandidate={handleEditCandidate}
      />

      <CandidateDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        candidate={selectedCandidate}
        mode={drawerMode}
      />

      <Dialog open={singleUploadOpen} onOpenChange={setSingleUploadOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Resume & Create Candidate</DialogTitle>
          </DialogHeader>
          <ResumeUpload
            allowBulk={false}
            autoCreateCandidates={true}
            onUploadComplete={(result) => {
              if (!("results" in result)) {
                handleSingleUploadComplete(result);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Resume Upload</DialogTitle>
          </DialogHeader>
          <BulkResumeUpload onUploadComplete={handleBulkUploadComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
