export interface WorkExperience {
  id?: number;
  job_title?: string;
  company_name?: string;
  location?: string;
  employment_type?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  description?: string;
  responsibilities?: string;
  created_at?: string;
}

export interface Candidate {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  notes?: string;
  organization_id: number;
  added_by_id?: number;
  skills?: string[];
  experience_years?: number;
  education?: Array<{
    degree?: string;
    school?: string;
    year?: number;
    field?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    year?: number;
    expiry?: number;
  }>;
  work_experiences?: WorkExperience[];
  raw_resume_text?: string;
  created_at: string;
  updated_at: string;

  // Computed fields
  resume_files_count: number;
  job_applications_count: number;
  latest_application_status?:
    | "new"
    | "reviewed"
    | "shortlisted"
    | "interviewed"
    | "rejected"
    | "hired";
}

export interface CandidateListItem {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  location?: string;
  skills?: string[];
  experience_years?: number;
  created_at: string;

  // Summary fields for list view
  resume_files_count: number;
  job_applications_count: number;
  latest_application_status?:
    | "new"
    | "reviewed"
    | "shortlisted"
    | "interviewed"
    | "rejected"
    | "hired";
}

export interface CandidateCreate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  notes?: string;
}

export interface CandidateUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  notes?: string;
  skills?: string[];
  experience_years?: number;
  education?: Array<{
    degree?: string;
    school?: string;
    year?: number;
    field?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    year?: number;
    expiry?: number;
  }>;
}

// Helper type for search/filtering
export interface CandidateFilters {
  search?: string;
  skills?: string[];
  experience_min?: number;
  experience_max?: number;
  location?: string;
  application_status?: string;
}
