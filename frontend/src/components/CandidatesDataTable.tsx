import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteCandidate } from "@/hooks/useCandidates";
import type { CandidateListItem } from "@/types/candidate";

interface CandidatesDataTableProps {
  data: CandidateListItem[];
  isLoading?: boolean;
  onCreateCandidate?: () => void;
  onEditCandidate?: (candidate: CandidateListItem) => void;
}

export function CandidatesDataTable({
  data,
  isLoading,
  onCreateCandidate: _onCreateCandidate,
  onEditCandidate,
}: CandidatesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    skills: false,
    latest_application_status: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});

  const deleteCandidateMutation = useDeleteCandidate();

  const navigate = useNavigate();

  const getFullName = (candidate: CandidateListItem) => {
    const parts = [candidate.first_name, candidate.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "No name";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns: ColumnDef<CandidateListItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "name",
      header: ({ column }) => {
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => {
        const candidate = row.original;
        return <div className="text-sm font-medium text-gray-900">{getFullName(candidate)}</div>;
      },
      sortingFn: (rowA, rowB) => {
        const nameA = getFullName(rowA.original);
        const nameB = getFullName(rowB.original);
        return nameA.localeCompare(nameB);
      },
    },
    {
      accessorKey: "email",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>,
      cell: ({ row }) => {
        const email = row.getValue("email") as string;
        return email ? (
          <span className="text-sm text-gray-900">{email}</span>
        ) : (
          <span className="text-sm text-gray-400">No email</span>
        );
      },
    },
    {
      accessorKey: "location",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</span>,
      cell: ({ row }) => {
        const location = row.getValue("location") as string;
        return location ? (
          <span className="text-sm text-gray-500">{location}</span>
        ) : (
          <span className="text-sm text-gray-400">Not specified</span>
        );
      },
    },
    {
      accessorKey: "skills",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Skills</span>,
      cell: ({ row }) => {
        const skills = row.getValue("skills") as string[];
        if (!skills || skills.length === 0) {
          return <span className="text-sm text-gray-400">No skills</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 2).map((skill, index) => (
              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                {skill}
              </span>
            ))}
            {skills.length > 2 && (
              <span className="text-xs text-gray-400">+{skills.length - 2}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "experience_years",
      header: ({ column }) => {
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            Experience
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => {
        const years = row.getValue("experience_years") as number;
        if (!years) return <span className="text-sm text-gray-400">Not specified</span>;
        return (
          <span className="text-sm text-gray-500">
            {years} year{years !== 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "latest_application_status",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Latest Status</span>,
      cell: ({ row }) => {
        const status = row.getValue("latest_application_status") as string;
        if (!status) {
          return <span className="text-sm text-gray-400">No applications</span>;
        }
        return (
          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs capitalize">
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "job_applications_count",
      header: ({ column }) => {
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            Applications
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => {
        const count = row.getValue("job_applications_count") as number;
        return <span className="text-sm font-medium text-gray-900">{count}</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            Added
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return <span className="text-sm text-gray-500">{formatDate(date)}</span>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const candidate = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}`)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditCandidate?.(candidate)}>
                Edit candidate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this candidate?")) {
                    deleteCandidateMutation.mutate(candidate.id);
                  }
                }}
              >
                Delete candidate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-4">
        <input
          placeholder="Search candidates..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("email")?.setFilterValue(event.target.value)}
          className="max-w-sm border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                {headerGroup.headers.map((header) => {
                  return (
                    <th key={header.id} className="px-4 py-3 text-left">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-sm text-gray-500">
                  {isLoading ? "Loading..." : "No candidates found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 pt-4">
        <div className="flex-1 text-sm text-gray-500">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
        >
          Previous
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  );
}
