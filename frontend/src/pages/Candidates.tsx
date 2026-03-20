import { BulkResumeUpload } from "@/components/BulkResumeUpload";
import { CandidateDrawer } from "@/components/CandidateDrawer";
import { CandidatesDataTable } from "@/components/CandidatesDataTable";
import { ResumeUpload } from "@/components/ResumeUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCandidates } from "@/hooks/useCandidates";
import type { CandidateListItem } from "@/types/candidate";
import type { BulkUploadResult, UploadResult } from "@/types/upload";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function Candidates() {
  const { data: candidates = [], isLoading, error } = useCandidates();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateListItem | null>(null);
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
    setUploadOpen(false);
    queryClient.invalidateQueries({ queryKey: ["candidates"] });

    if ("candidate" in result) {
      const candidate = (result as any).candidate;
      toast.success(
        `Successfully created candidate ${candidate.first_name} ${candidate.last_name}!`
      );
    } else {
      toast.success("Resume uploaded successfully!");
    }
  };

  const handleBulkUploadComplete = (results: BulkUploadResult) => {
    setUploadOpen(false);
    queryClient.invalidateQueries({ queryKey: ["candidates"] });

    const successCount = results.results.filter((r) => r.success).length;
    const totalCount = results.results.length;
    const failedCount = totalCount - successCount;

    if (successCount > 0) {
      toast.success(
        `Successfully uploaded ${successCount} of ${totalCount} resumes!`
      );
    }
    if (failedCount > 0) {
      toast.error(
        `Failed to upload ${failedCount} resume${failedCount > 1 ? "s" : ""}`
      );
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-medium text-foreground">Candidates</h1>
        <p className="mt-4 text-sm text-destructive">
          Error loading candidates. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-4">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-foreground">Candidates</h1>
      </div>

      <CandidatesDataTable
        data={candidates}
        isLoading={isLoading}
        onCreateCandidate={handleCreateCandidate}
        onEditCandidate={handleEditCandidate}
        onUpload={() => setUploadOpen(true)}
      />

      <CandidateDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        candidate={selectedCandidate}
        mode={drawerMode}
      />

      {/* Upload dialog with single / bulk tabs */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Resumes</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="single">
            <TabsList>
              <TabsTrigger value="single">Single Upload</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="mt-4">
              <ResumeUpload
                allowBulk={false}
                autoCreateCandidates={true}
                onUploadComplete={(result) => {
                  if (!("results" in result)) {
                    handleSingleUploadComplete(result);
                  }
                }}
              />
            </TabsContent>
            <TabsContent value="bulk" className="mt-4">
              <BulkResumeUpload
                onUploadComplete={handleBulkUploadComplete}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
