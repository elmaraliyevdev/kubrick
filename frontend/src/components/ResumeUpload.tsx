import { useBulkUploadResumes, useUploadResume, useUploadResumeCreateCandidate } from "@/hooks/useFiles";
import type { BulkUploadResult, UploadResult } from "@/types/upload";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface UploadedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  result?: UploadResult;
}

interface ResumeUploadProps {
  candidateId?: number;
  onUploadComplete?: (results: UploadResult | BulkUploadResult) => void;
  allowBulk?: boolean;
  autoCreateCandidates?: boolean;
}

export function ResumeUpload({
  candidateId,
  onUploadComplete,
  allowBulk = false,
  autoCreateCandidates = true,
}: ResumeUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadResumeMutation = useUploadResume();
  const uploadResumeCreateCandidateMutation = useUploadResumeCreateCandidate();
  const bulkUploadMutation = useBulkUploadResumes();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending" as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: allowBulk,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFile = async (uploadedFile: UploadedFile): Promise<UploadResult> => {
    setFiles((prev) =>
      prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: "uploading", progress: 50 } : f))
    );

    try {
      let result;

      if (candidateId) {
        result = await uploadResumeMutation.mutateAsync({
          candidateId,
          file: uploadedFile.file,
        });
      } else if (autoCreateCandidates) {
        result = await uploadResumeCreateCandidateMutation.mutateAsync({
          file: uploadedFile.file,
        });
      } else {
        throw new Error("Either candidateId must be provided or autoCreateCandidates must be true");
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id ? { ...f, status: "success", progress: 100, result } : f
        )
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id ? { ...f, status: "error", progress: 0, error: errorMessage } : f
        )
      );
      throw error;
    }
  };

  const uploadAllFiles = async () => {
    setIsUploading(true);

    try {
      if (allowBulk) {
        const fileList = files.map((f) => f.file);
        const results = await bulkUploadMutation.mutateAsync({
          files: fileList,
          autoCreateCandidates,
        });

        setFiles((prev) =>
          prev.map((f, index) => ({
            ...f,
            status: results.results[index]?.success ? "success" : "error",
            progress: 100,
            error: results.results[index]?.error,
          }))
        );

        onUploadComplete?.(results);
      } else {
        const results: UploadResult[] = [];
        for (const file of files) {
          if (file.status === "pending") {
            const result = await uploadSingleFile(file);
            results.push(result);
          }
        }
        if (results.length > 0) {
          onUploadComplete?.(results[0]);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const pendingFiles = files.filter((f) => f.status === "pending");
  const hasFiles = files.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        Upload Resume{allowBulk ? "s" : ""}
      </h3>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-500">
          {isDragActive
            ? "Drop the files here..."
            : `Drop resume${allowBulk ? "s" : ""} here or click to browse`}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, DOCX, DOC, TXT up to 10MB{allowBulk && " (max 20 files)"}
        </p>
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="mt-4 space-y-2">
          {files.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{uploadedFile.file.name}</p>
                <p className="text-xs text-gray-400">
                  {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploadedFile.status === "uploading" && (
                  <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                )}
                {uploadedFile.status === "success" && uploadedFile.result && (
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadedFile.result.parsed_data.skills_found > 0 &&
                      `${uploadedFile.result.parsed_data.skills_found} skills`}
                    {uploadedFile.result.parsed_data.email_found && " | Email found"}
                    {uploadedFile.result.parsed_data.experience_years &&
                      ` | ${uploadedFile.result.parsed_data.experience_years}y exp`}
                  </p>
                )}
                {uploadedFile.error && (
                  <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {uploadedFile.status === "success" && (
                  <span className="text-xs text-green-600">Done</span>
                )}
                {uploadedFile.status === "error" && (
                  <span className="text-xs text-red-600">Failed</span>
                )}
                {uploadedFile.status === "pending" && (
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {pendingFiles.length > 0 && (
        <button
          onClick={uploadAllFiles}
          disabled={isUploading}
          className="bg-gray-900 text-white rounded-md h-9 px-4 text-sm w-full mt-4 disabled:opacity-50"
        >
          {isUploading
            ? `Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`
            : `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""}`}
        </button>
      )}

      {/* Bulk upload note */}
      {allowBulk && (
        <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
          Bulk upload: Files will be automatically parsed and{" "}
          {autoCreateCandidates
            ? "new candidates will be created"
            : "added to existing candidates"}
          .
        </p>
      )}
    </div>
  );
}
