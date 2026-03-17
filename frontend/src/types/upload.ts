export interface UploadResult {
  message: string;
  file_id: number;
  parsed_data: {
    skills_found: number;
    email_found: boolean;
    phone_found: boolean;
    experience_years?: number;
    education_items: number;
  };
}

export interface BulkUploadFileResult {
  filename: string;
  success: boolean;
  error?: string;
  candidate_id?: number;
  parsed_data?: {
    skills_found: number;
    email_found: boolean;
    phone_found: boolean;
    experience_years?: number;
  };
}

export interface BulkUploadResult {
  message: string;
  results: BulkUploadFileResult[];
}
