import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { BulkUploadResult } from "@/types/upload";
import { useState } from "react";
import { ResumeUpload } from "./ResumeUpload";

interface BulkResumeUploadProps {
  onUploadComplete?: (results: BulkUploadResult) => void;
}

export function BulkResumeUpload({ onUploadComplete }: BulkResumeUploadProps) {
  const [autoCreateCandidates, setAutoCreateCandidates] = useState(true);
  const [results, setResults] = useState<BulkUploadResult | null>(null);

  const handleUploadComplete = (uploadResults: BulkUploadResult) => {
    setResults(uploadResults);
    onUploadComplete?.(uploadResults);
  };

  const getSuccessCount = (): number => {
    if (!results?.results) return 0;
    return results.results.filter((r) => r.success).length;
  };

  const getFailureCount = (): number => {
    if (!results?.results) return 0;
    return results.results.filter((r) => !r.success).length;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Bulk Resume Upload</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-create"
            checked={autoCreateCandidates}
            onCheckedChange={setAutoCreateCandidates}
          />
          <Label htmlFor="auto-create" className="text-sm text-gray-700">
            Automatically create new candidates from resumes
          </Label>
        </div>

        {!autoCreateCandidates && (
          <p className="text-sm text-gray-500 mt-3">
            When disabled, resumes will only be parsed but candidates won't be automatically
            created. You'll need to manually assign parsed data to existing candidates.
          </p>
        )}
      </div>

      <ResumeUpload
        allowBulk={true}
        autoCreateCandidates={autoCreateCandidates}
        onUploadComplete={(uploadResults) => {
          if ("results" in uploadResults) {
            handleUploadComplete(uploadResults);
          }
        }}
      />

      {results && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Upload Results</h3>

          <div className="flex gap-8 mb-4">
            <div>
              <span className="text-2xl font-semibold text-green-600">{getSuccessCount()}</span>
              <span className="text-sm text-gray-500 ml-2">successful</span>
            </div>
            <div>
              <span className="text-2xl font-semibold text-gray-900">{getFailureCount()}</span>
              <span className="text-sm text-gray-500 ml-2">failed</span>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm text-gray-900">{result.filename}</p>
                  {result.success && result.parsed_data && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {result.parsed_data.skills_found > 0 && `${result.parsed_data.skills_found} skills`}
                      {result.parsed_data.email_found && " | Email"}
                      {result.parsed_data.experience_years && ` | ${result.parsed_data.experience_years}y exp`}
                    </p>
                  )}
                  {result.error && <p className="text-xs text-red-600 mt-0.5">{result.error}</p>}
                </div>
                <span className={`text-xs ${result.success ? "text-green-600" : "text-red-600"}`}>
                  {result.success ? "Success" : "Failed"}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setResults(null)}
            className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm w-full mt-4"
          >
            Upload More Files
          </button>
        </div>
      )}
    </div>
  );
}
