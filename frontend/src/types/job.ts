export interface Job {
  id: number
  title: string
  slug: string
  description: string
  location?: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship'
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  benefits?: string[]
  skills_required?: string
  work_arrangement: 'remote_only' | 'remote_possible' | 'hybrid' | 'onsite' | 'relocation_required'
  status: 'open' | 'closed' | 'draft'
  category?: string
  user_id: number
  organization_id: number
  organization?: {
    id: number
    name: string
    slug: string
  }
  created_at: string
  updated_at: string
  candidate_count: number
}

export interface JobCreate {
  title: string
  description: string
  location?: string
  employment_type?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  benefits?: string[]
  skills_required?: string
  work_arrangement?: string
  status?: string
  category?: string
}

export interface JobUpdate {
  title?: string
  description?: string
  location?: string
  employment_type?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  benefits?: string[]
  skills_required?: string
  work_arrangement?: string
  status?: string
  category?: string
}
