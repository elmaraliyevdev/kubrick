import { useAuth } from "@/hooks/useAuth";
import {
  useJobApplicationForm,
  useUpdateJobApplicationForm,
} from "@/hooks/useJobs";
import type { ApplicationFormStandardConfig, JobApplicationFormSettingsDTO } from "@/types/job";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_STD: ApplicationFormStandardConfig = {
  show_phone: true,
  show_location: true,
  show_linkedin: true,
  show_portfolio: true,
  show_cover_letter: true,
  require_phone: false,
  require_location: false,
  require_linkedin: false,
  require_portfolio: false,
  require_cover_letter: false,
};

const FIELD_ROWS: {
  showKey: keyof ApplicationFormStandardConfig;
  reqKey: keyof ApplicationFormStandardConfig;
  label: string;
  hint: string;
}[] = [
  { showKey: "show_phone", reqKey: "require_phone", label: "Phone", hint: "Contact number" },
  { showKey: "show_location", reqKey: "require_location", label: "Location", hint: "City / region" },
  { showKey: "show_linkedin", reqKey: "require_linkedin", label: "LinkedIn", hint: "Profile URL" },
  { showKey: "show_portfolio", reqKey: "require_portfolio", label: "Portfolio", hint: "Website or portfolio URL" },
  { showKey: "show_cover_letter", reqKey: "require_cover_letter", label: "Cover letter", hint: "Free-text introduction" },
];

function fieldTypeLabel(t: string) {
  const map: Record<string, string> = {
    text: "Short text",
    textarea: "Long text",
    number: "Number",
    select: "Dropdown",
    checkbox: "Checkbox",
    date: "Date",
    url: "URL",
  };
  return map[t] || t;
}

function ApplicationFormReadOnly({
  data,
  embedded = false,
}: {
  data: JobApplicationFormSettingsDTO;
  embedded?: boolean;
}) {
  const cfg = data.resolved.config;
  const custom = data.resolved.custom_fields;

  const standardLines: { label: string; on: boolean; req: boolean }[] = [
    { label: "Phone", on: cfg.show_phone, req: cfg.require_phone },
    { label: "Location", on: cfg.show_location, req: cfg.require_location },
    { label: "LinkedIn", on: cfg.show_linkedin, req: cfg.require_linkedin },
    { label: "Portfolio", on: cfg.show_portfolio, req: cfg.require_portfolio },
    { label: "Cover letter", on: cfg.show_cover_letter, req: cfg.require_cover_letter },
  ];

  return (
    <div className={cn("space-y-8", embedded && "space-y-5 pt-2")}>
      {!embedded ? (
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">What candidates see</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is the live application form for this job on your career page. Only admins can change it.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-5 shadow-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">Form source</span>
          {data.use_organization_defaults ? (
            <Badge variant="secondary">Organization default</Badge>
          ) : (
            <Badge variant="default" className="font-normal">
              Custom for this job
            </Badge>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {data.use_organization_defaults
            ? "Matches Settings → Career Page. Changes there apply to this job automatically."
            : "Standard fields and library questions are configured only for this role."}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground">Standard fields</h3>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {standardLines.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="text-foreground">{row.label}</span>
              {!row.on ? (
                <span className="text-muted-foreground">Hidden</span>
              ) : row.req ? (
                <Badge variant="outline" className="font-normal">
                  Required
                </Badge>
              ) : (
                <span className="text-muted-foreground">Optional</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground">Custom questions</h3>
        {custom.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No extra questions for this job.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {custom.map((f) => (
              <li
                key={f.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-foreground">{f.label}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {fieldTypeLabel(f.field_type)}
                  </Badge>
                  {f.is_required ? (
                    <span className="text-xs text-muted-foreground">Required when shown</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Full-page content for the job &gt; Application tab (admin editor or recruiter read-only).
 */
export function JobApplicationFormTab({ jobId }: { jobId: number }) {
  const { user } = useAuth();
  const { data, isLoading, error } = useJobApplicationForm(jobId);
  const updateMutation = useUpdateJobApplicationForm();

  const [inheritOrg, setInheritOrg] = useState(true);
  const [std, setStd] = useState<ApplicationFormStandardConfig>(DEFAULT_STD);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!data) return;
    setInheritOrg(data.use_organization_defaults);
    if (data.use_organization_defaults) {
      setStd({ ...DEFAULT_STD, ...data.resolved.config });
    } else if (data.standard_config) {
      setStd({ ...DEFAULT_STD, ...data.standard_config });
      const ids = data.custom_field_ids ?? data.resolved.custom_fields.map((f) => f.id);
      setSelectedFieldIds(new Set(ids));
    } else {
      setStd({ ...DEFAULT_STD, ...data.resolved.config });
      setSelectedFieldIds(new Set(data.resolved.custom_fields.map((f) => f.id)));
    }
  }, [data]);

  const orgFieldsOrdered = useMemo(
    () => [...(data?.organization_custom_fields ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [data?.organization_custom_fields]
  );

  const orderedSelectedIds = useMemo(() => {
    return orgFieldsOrdered.map((f) => f.id).filter((id) => selectedFieldIds.has(id));
  }, [orgFieldsOrdered, selectedFieldIds]);

  const toggleFieldId = (id: number) => {
    setSelectedFieldIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleModeChange = (value: string) => {
    const inherit = value === "inherit";
    setInheritOrg(inherit);
    if (!inherit && data) {
      setStd({ ...DEFAULT_STD, ...data.resolved.config });
      setSelectedFieldIds(new Set(data.resolved.custom_fields.map((f) => f.id)));
    }
  };

  const handleSave = () => {
    if (inheritOrg) {
      updateMutation.mutate(
        { jobId, payload: { use_organization_defaults: true } },
        {
          onSuccess: () => toast.success("This job now uses the organization application form."),
          onError: () => toast.error("Could not save."),
        }
      );
      return;
    }
    updateMutation.mutate(
      {
        jobId,
        payload: {
          use_organization_defaults: false,
          standard_config: std,
          custom_field_ids: orderedSelectedIds,
        },
      },
      {
        onSuccess: () => toast.success("Application form saved for this job."),
        onError: () => toast.error("Could not save."),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-32 rounded-xl bg-muted" />
        <div className="h-48 rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Application form settings could not be loaded. Try again later.
      </p>
    );
  }

  if (user?.role !== "admin") {
    return <ApplicationFormReadOnly data={data} />;
  }

  const mode = inheritOrg ? "inherit" : "custom";

  return (
    <div className="w-full max-w-3xl space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Application form</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Control which fields appear when someone applies to <span className="font-medium text-foreground">this job</span>{" "}
          on your public career page. Manage the shared field library and org-wide defaults in{" "}
          <Link
            to="/settings/career-page"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Career Page settings
            <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
          </Link>
          .
        </p>
      </header>

      <RadioGroup value={mode} onValueChange={handleModeChange} className="grid gap-3 sm:grid-cols-2">
        <label
          htmlFor="mode-inherit"
          className={cn(
            "relative flex cursor-pointer flex-col rounded-xl border p-4 transition-colors",
            mode === "inherit"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "border-border bg-card hover:bg-muted/30"
          )}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="inherit" id="mode-inherit" className="mt-0.5" />
            <div className="space-y-1">
              <span className="text-sm font-medium text-foreground">Use organization form</span>
              <p className="text-xs text-muted-foreground leading-snug">
                Same fields and custom questions as in Career Page settings. Easiest to maintain.
              </p>
            </div>
          </div>
        </label>
        <label
          htmlFor="mode-custom"
          className={cn(
            "relative flex cursor-pointer flex-col rounded-xl border p-4 transition-colors",
            mode === "custom"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "border-border bg-card hover:bg-muted/30"
          )}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="custom" id="mode-custom" className="mt-0.5" />
            <div className="space-y-1">
              <span className="text-sm font-medium text-foreground">Customize for this job</span>
              <p className="text-xs text-muted-foreground leading-snug">
                Turn standard fields on or off and pick which library questions apply to this role only.
              </p>
            </div>
          </div>
        </label>
      </RadioGroup>

      {inheritOrg ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6">
          <p className="text-sm font-medium text-foreground">Current form (organization default)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Below is what applicants see today. To change it for all jobs, use Career Page settings.
          </p>
          <ApplicationFormReadOnly data={data} embedded />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Standard fields</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose whether each field appears, and if it must be filled when shown.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Field</TableHead>
                    <TableHead className="text-center">Ask on form</TableHead>
                    <TableHead className="text-center">Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FIELD_ROWS.map(({ showKey, reqKey, label, hint }) => (
                    <TableRow key={showKey}>
                      <TableCell>
                        <div className="font-medium text-foreground">{label}</div>
                        <div className="text-xs text-muted-foreground">{hint}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={std[showKey]}
                            onCheckedChange={(v) =>
                              setStd((s) => ({ ...s, [showKey]: v, ...(v ? {} : { [reqKey]: false }) }))
                            }
                            aria-label={`Show ${label}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {std[showKey] ? (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={std[reqKey]}
                              onCheckedChange={(v) => setStd((s) => ({ ...s, [reqKey]: v === true }))}
                              aria-label={`Require ${label}`}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Questions from your library</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Check the extra questions to include on this job. Order follows your library order.
              </p>
            </div>
            {orgFieldsOrdered.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                No custom questions in your library yet. Add them under{" "}
                <Link to="/settings/career-page" className="font-medium text-primary underline-offset-4 hover:underline">
                  Career Page settings
                </Link>
                .
              </div>
            ) : (
              <ul className="space-y-2">
                {orgFieldsOrdered.map((f) => (
                  <li
                    key={f.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                      selectedFieldIds.has(f.id) ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <Checkbox
                      id={`lib-field-${f.id}`}
                      checked={selectedFieldIds.has(f.id)}
                      onCheckedChange={() => toggleFieldId(f.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`lib-field-${f.id}`} className="text-sm font-medium leading-snug">
                        {f.label}
                      </Label>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-normal text-xs">
                          {fieldTypeLabel(f.field_type)}
                        </Badge>
                        {f.is_required ? (
                          <span className="text-xs text-muted-foreground">Marked required in library</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Changes apply to new applications. Existing submissions are unchanged.
        </p>
        <Button type="button" onClick={handleSave} disabled={updateMutation.isPending} className="sm:min-w-[160px]">
          {updateMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/** @deprecated Use JobApplicationFormTab inside the Application tab */
export function JobApplicationFormSection({ jobId }: { jobId: number }) {
  return <JobApplicationFormTab jobId={jobId} />;
}
