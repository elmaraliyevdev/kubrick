import api from "@/utils/api";
import type { PipelineStage } from "@/constants/pipeline";

export interface EmailTemplate {
  id: number;
  organization_id: number;
  stage: PipelineStage;
  name: string | null;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at?: string | null;
}

export interface OutboundEmail {
  id: number;
  job_application_id: number;
  template_id: number | null;
  to_email: string;
  subject_snapshot: string;
  status: string;
  provider_message_id: string | null;
  first_opened_at: string | null;
  created_at: string;
}

export const candidateEmailApi = {
  listTemplates: async (): Promise<EmailTemplate[]> => {
    const { data } = await api.get<EmailTemplate[]>("/organizations/me/email-templates");
    return data;
  },

  upsertTemplate: async (
    stage: PipelineStage,
    payload: { name?: string | null; subject: string; body_html: string }
  ): Promise<EmailTemplate> => {
    const { data } = await api.put<EmailTemplate>(
      `/organizations/me/email-templates/${stage}`,
      payload
    );
    return data;
  },

  deleteTemplate: async (stage: PipelineStage): Promise<void> => {
    await api.delete(`/organizations/me/email-templates/${stage}`);
  },

  send: async (
    applicationId: number,
    payload: { template_id?: number; subject?: string; body_html?: string }
  ): Promise<OutboundEmail> => {
    const { data } = await api.post<OutboundEmail>(`/job-applications/${applicationId}/emails`, payload);
    return data;
  },

  listOutbound: async (applicationId: number): Promise<{ emails: OutboundEmail[] }> => {
    const { data } = await api.get<{ emails: OutboundEmail[] }>(`/job-applications/${applicationId}/emails`);
    return data;
  },
};
