import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import type { DashboardApplicationRow } from "@/hooks/useDashboard";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DashboardApplicationsTable({
  data,
  isLoading,
}: {
  data: DashboardApplicationRow[];
  isLoading?: boolean;
}) {
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<DashboardApplicationRow>[]>(
    () => [
      {
        id: "candidate",
        accessorFn: (row) => row.candidate_name,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Candidate" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.candidate_name}</span>
        ),
      },
      {
        id: "job",
        accessorFn: (row) => row.job_title,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Job" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left text-primary hover:underline"
            onClick={() => navigate(`/jobs/${row.original.job_id}`)}
          >
            {row.original.job_title}
          </button>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Stage" />,
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">{row.original.status.replace(/_/g, " ")}</span>
        ),
      },
      {
        id: "match_score",
        accessorFn: (row) => row.match_score ?? -1,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Match" />,
        cell: ({ row }) => {
          const s = row.original.match_score;
          return <span className="tabular-nums">{s != null ? `${s}%` : "—"}</span>;
        },
      },
      {
        id: "created_at",
        accessorFn: (row) => row.created_at ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Applied" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.created_at)}</span>
        ),
      },
    ],
    [navigate]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        Loading applications…
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Filter applications…"
      emptyMessage="No applications in this period."
      initialSorting={[{ id: "created_at", desc: true }]}
      showToolbar={false}
    />
  );
}
