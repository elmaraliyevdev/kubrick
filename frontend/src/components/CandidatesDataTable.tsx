import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteCandidate } from "@/hooks/useCandidates";
import { cn } from "@/lib/utils";
import type { CandidateListItem } from "@/types/candidate";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Upload } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface CandidatesDataTableProps {
  data: CandidateListItem[];
  isLoading?: boolean;
  onCreateCandidate?: () => void;
  onEditCandidate?: (candidate: CandidateListItem) => void;
  onUpload?: () => void;
}

function getFullName(candidate: CandidateListItem) {
  const parts = [candidate.first_name, candidate.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "No name";
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const globalFilterFn: FilterFn<CandidateListItem> = (row, _columnId, filterValue) => {
  const q = String(filterValue).toLowerCase();
  if (!q) return true;
  const c = row.original;
  const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase();
  const email = (c.email ?? "").toLowerCase();
  const location = (c.location ?? "").toLowerCase();
  return name.includes(q) || email.includes(q) || location.includes(q);
};

export function CandidatesDataTable({
  data,
  isLoading,
  onCreateCandidate,
  onEditCandidate,
  onUpload,
}: CandidatesDataTableProps) {
  const deleteCandidateMutation = useDeleteCandidate();
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<CandidateListItem>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => getFullName(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{getFullName(row.original)}</span>,
      },
      {
        id: "email",
        accessorFn: (row) => row.email ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
        ),
      },
      {
        id: "location",
        accessorFn: (row) => row.location ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.location || "—"}</span>
        ),
      },
      {
        id: "skills",
        accessorFn: (row) => (row.skills ?? []).join(", "),
        header: "Skills",
        enableSorting: false,
        cell: ({ row }) => {
          const skills = row.original.skills;
          if (!skills?.length) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 2).map((skill, index) => (
                <span
                  key={index}
                  className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 2 && (
                <span className="text-xs text-muted-foreground">+{skills.length - 2}</span>
              )}
            </div>
          );
        },
      },
      {
        id: "experience_years",
        accessorFn: (row) => row.experience_years ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Experience" />,
        cell: ({ row }) => {
          const years = row.original.experience_years;
          if (years == null || years === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span className="text-muted-foreground">
              {years} yr{years !== 1 ? "s" : ""}
            </span>
          );
        },
      },
      {
        id: "latest_application_status",
        accessorFn: (row) => row.latest_application_status ?? "",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original.latest_application_status;
          if (!status) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs capitalize">
              {status}
            </span>
          );
        },
      },
      {
        id: "created_at",
        accessorFn: (row) => row.created_at,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.created_at)}</span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const candidate = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "text-muted-foreground data-[popup-open]:bg-muted size-8"
                )}
                aria-label="Open menu"
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}`)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditCandidate?.(candidate)}>
                  Edit candidate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this candidate?")) {
                      deleteCandidateMutation.mutate(candidate.id);
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [deleteCandidateMutation, navigate, onEditCandidate]
  );

  const toolbarRight = (
    <div className="flex flex-wrap items-center gap-2">
      {onUpload ? (
        <Button variant="outline" size="sm" onClick={onUpload}>
          <Upload className="size-4" />
          Upload
        </Button>
      ) : null}
      {onCreateCandidate ? (
        <Button size="sm" onClick={onCreateCandidate}>
          <Plus className="size-4" />
          Add Candidate
        </Button>
      ) : null}
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search candidates…"
      globalFilterFn={globalFilterFn}
      initialSorting={[{ id: "created_at", desc: true }]}
      initialColumnVisibility={{
        skills: false,
        latest_application_status: false,
      }}
      showViewOptions
      toolbarRight={toolbarRight}
      emptyMessage={isLoading ? "Loading…" : "No candidates found."}
    />
  );
}
