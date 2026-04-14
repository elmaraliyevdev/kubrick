import { candidateEmailApi, type EmailTemplate } from "@/services/candidateEmail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGES } from "@/constants/pipeline";
import type { PipelineStage } from "@/constants/pipeline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function StageFields({
  stage,
  initial,
}: {
  stage: PipelineStage;
  initial: EmailTemplate | undefined;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    setName(initial?.name ?? "");
    setSubject(initial?.subject ?? "");
    setBodyHtml(initial?.body_html ?? "");
  }, [initial?.id, initial?.name, initial?.subject, initial?.body_html]);

  const saveMutation = useMutation({
    mutationFn: () =>
      candidateEmailApi.upsertTemplate(stage, {
        name: name.trim() || null,
        subject: subject.trim(),
        body_html: bodyHtml,
      }),
    onSuccess: () => {
      toast.success("Template saved");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: () => toast.error("Could not save template"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => candidateEmailApi.deleteTemplate(stage),
    onSuccess: () => {
      toast.success("Template removed");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setName("");
      setSubject("");
      setBodyHtml("");
    },
    onError: () => toast.error("Could not delete template"),
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor={`name-${stage}`}>Internal name (optional)</Label>
        <Input
          id={`name-${stage}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard interview invite"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`subj-${stage}`}>Subject</Label>
        <Input
          id={`subj-${stage}`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Update on your application — {{ job_title }}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`body-${stage}`}>HTML body</Label>
        <Textarea
          id={`body-${stage}`}
          rows={12}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          className="font-mono text-xs"
          placeholder={'<p>Hi {{ candidate_name }},</p>\n<p>…</p>'}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Merge fields: <code>{"{{ candidate_name }}"}</code>, <code>{"{{ candidate_first_name }}"}</code>,{" "}
        <code>{"{{ job_title }}"}</code>, <code>{"{{ organization_name }}"}</code>,{" "}
        <code>{"{{ recruiter_name }}"}</code>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !subject.trim() || !bodyHtml.trim()}
        >
          {saveMutation.isPending ? "Saving…" : "Save template"}
        </Button>
        {initial?.id ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirm("Remove this template for this stage?")) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function SettingsEmail() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: candidateEmailApi.listTemplates,
  });

  const byStage = useMemo(() => {
    const m = new Map<PipelineStage, EmailTemplate>();
    for (const t of templates) {
      m.set(t.stage as PipelineStage, t);
    }
    return m;
  }, [templates]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One template per pipeline stage for your organization. Recruiters can send these from the job pipeline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline stages</CardTitle>
          <CardDescription>
            Subject and body support Jinja-style placeholders (see each tab). Open tracking uses a small image pixel
            when candidates load images in email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-md bg-muted" />
          ) : (
            <Tabs defaultValue="applied" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1">
                {PIPELINE_STAGES.map((s) => (
                  <TabsTrigger key={s} value={s} className="text-xs">
                    {PIPELINE_STAGE_LABELS[s]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {PIPELINE_STAGES.map((s) => (
                <TabsContent key={s} value={s} className="mt-6">
                  <StageFields stage={s} initial={byStage.get(s)} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
