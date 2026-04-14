import { candidateEmailApi, type EmailTemplate } from "@/services/candidateEmail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PIPELINE_STAGE_LABELS } from "@/constants/pipeline";
import type { PipelineStage } from "@/constants/pipeline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface SendCandidateEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: number;
  /** Prefer templates for this pipeline stage in the dropdown. */
  preferredStage?: PipelineStage;
  candidateLabel: string;
}

export function SendCandidateEmailDialog({
  open,
  onOpenChange,
  applicationId,
  preferredStage,
  candidateLabel,
}: SendCandidateEmailDialogProps) {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: candidateEmailApi.listTemplates,
    enabled: open,
  });

  const preferred = useMemo(() => {
    return templates.find((t) => t.stage === preferredStage);
  }, [templates, preferredStage]);

  const [mode, setMode] = useState<"template" | "custom">("template");
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    if (!open) return;
    if (preferred && mode === "template") {
      setTemplateId(String(preferred.id));
    } else if (templates.length > 0 && mode === "template" && !templateId) {
      setTemplateId(String(templates[0].id));
    }
  }, [open, preferred, templates, mode, templateId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (mode === "template") {
        const tid = parseInt(templateId, 10);
        if (!tid) throw new Error("Select a template");
        return candidateEmailApi.send(applicationId, { template_id: tid });
      }
      return candidateEmailApi.send(applicationId, { subject, body_html: bodyHtml });
    },
    onSuccess: () => {
      toast.success("Email sent");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(typeof msg === "string" ? msg : "Failed to send email");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email {candidateLabel}</DialogTitle>
          <DialogDescription>
            Uses merge fields like{" "}
            <code className="text-xs">{"{{ candidate_name }}"}</code>,{" "}
            <code className="text-xs">{"{{ job_title }}"}</code>,{" "}
            <code className="text-xs">{"{{ organization_name }}"}</code>,{" "}
            <code className="text-xs">{"{{ recruiter_name }}"}</code>. Manage defaults in{" "}
            <Link to="/settings/email" className="text-primary underline-offset-4 hover:underline">
              Settings → Email
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "template" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("template")}
            >
              Template
            </Button>
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("custom")}
            >
              Custom
            </Button>
          </div>

          {mode === "template" ? (
            <div className="space-y-2">
              <Label htmlFor="tpl">Template</Label>
              <Select
                value={templateId}
                onValueChange={setTemplateId}
                disabled={isLoading || templates.length === 0}
              >
                <SelectTrigger id="tpl">
                  <SelectValue placeholder={isLoading ? "Loading…" : "Choose a template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t: EmailTemplate) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name?.trim() || PIPELINE_STAGE_LABELS[t.stage as PipelineStage]}{" "}
                      <span className="text-muted-foreground">({t.stage})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No templates yet. Add them under Settings → Email.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="subj">Subject</Label>
                <Textarea
                  id="subj"
                  rows={2}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Regarding your application — {{ job_title }}"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">HTML body</Label>
                <Textarea
                  id="body"
                  rows={8}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="<p>Hi {{ candidate_name }}, …</p>"
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => sendMutation.mutate()}
            disabled={
              sendMutation.isPending ||
              (mode === "template" && (!templateId || templates.length === 0)) ||
              (mode === "custom" && (!subject.trim() || !bodyHtml.trim()))
            }
          >
            {sendMutation.isPending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
