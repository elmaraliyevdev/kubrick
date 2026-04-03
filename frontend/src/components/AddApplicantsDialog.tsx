import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pipelineApi } from "@/services/pipeline";
import type { EligiblePipelineCandidate } from "@/types/pipeline";
import { Loader2Icon } from "lucide-react";

function formatCandidateLabel(c: EligiblePipelineCandidate) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return name || c.email || `Candidate #${c.id}`;
}

interface AddApplicantsDialogProps {
  jobId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddApplicantsDialog({ jobId, open, onOpenChange }: AddApplicantsDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setSelected(new Set());
    }
  }, [open]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pipeline", "eligible-candidates", jobId, debouncedSearch],
    queryFn: () => pipelineApi.getEligiblePipelineCandidates(jobId, debouncedSearch || undefined),
    enabled: open && jobId > 0,
  });

  const candidates = data?.candidates ?? [];

  const allVisibleIds = useMemo(() => candidates.map((c) => c.id), [candidates]);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  const toggle = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(allVisibleIds));
  };

  const addMutation = useMutation({
    mutationFn: (ids: number[]) => pipelineApi.addPipelineApplicants(jobId, ids),
    onSuccess: (res) => {
      const n = res.created.length;
      if (n > 0) {
        toast.success(n === 1 ? "Added 1 applicant" : `Added ${n} applicants`);
      }
      if (res.skipped.length > 0) {
        toast.message(`${res.skipped.length} skipped (already on job or not found)`);
      }
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
        : undefined;
      toast.error(typeof msg === "string" ? msg : "Could not add applicants");
    },
  });

  const busy = addMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Add applicants</DialogTitle>
          <DialogDescription>
            Select candidates from your pool to add to this job as applied. They must not already be on this job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="add-applicants-search" className="sr-only">
              Search candidates
            </Label>
            <Input
              id="add-applicants-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={busy}
            />
          </div>

          {isLoading || (isFetching && !data) ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2Icon className="size-6 animate-spin" aria-hidden />
            </div>
          ) : candidates.length === 0 ? (
            <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No candidates match your search, or everyone is already on this job.
            </p>
          ) : (
            <div className="max-h-[min(320px,50vh)] space-y-0 overflow-y-auto rounded-md border border-border">
              <div className="sticky top-0 z-[1] flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2">
                <Checkbox
                  id="add-applicants-select-all"
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  disabled={busy}
                />
                <Label htmlFor="add-applicants-select-all" className="text-xs font-medium text-muted-foreground">
                  Select all
                </Label>
              </div>
              <ul className="divide-y divide-border">
                {candidates.map((c) => {
                  const id = `candidate-${c.id}`;
                  return (
                    <li key={c.id}>
                      <label
                        htmlFor={id}
                        className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/30"
                      >
                        <Checkbox
                          id={id}
                          className="mt-0.5"
                          checked={selected.has(c.id)}
                          onCheckedChange={(v) => toggle(c.id, v === true)}
                          disabled={busy}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">{formatCandidateLabel(c)}</span>
                          {c.email ? (
                            <span className="block text-xs text-muted-foreground">{c.email}</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => addMutation.mutate(Array.from(selected))}
            disabled={busy || selected.size === 0}
          >
            {busy ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
                Adding…
              </>
            ) : (
              `Add${selected.size ? ` (${selected.size})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
