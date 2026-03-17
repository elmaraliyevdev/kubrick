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

import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteJob } from "@/hooks/useJobs";
import type { Job } from "@/types/job";
import { useNavigate } from "react-router-dom";

interface JobsDataTableProps {
  data: Job[];
  isLoading?: boolean;
  onCreateJob?: () => void;
  onEditJob?: (job: Job) => void;
}

export function JobsDataTable({ data, isLoading, onCreateJob: _onCreateJob, onEditJob }: JobsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const navigate = useNavigate();
  const deleteJobMutation = useDeleteJob();

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max?.toLocaleString()}`;
  };

  const columns: ColumnDef<Job>[] = [
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
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            Job Title
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => <div className="text-sm font-medium text-gray-900">{row.getValue("title")}</div>,
    },
    {
      accessorKey: "status",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const isOpen = status === "open";
        return (
          <span
            className={`inline-flex px-2 py-0.5 rounded text-xs capitalize ${
              isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "location",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</span>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">{row.getValue("location") || "Remote"}</span>
      ),
    },
    {
      accessorKey: "employment_type",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</span>,
      cell: ({ row }) => {
        const type = row.getValue("employment_type") as string;
        return <span className="text-sm text-gray-500 capitalize">{type.replace("_", " ")}</span>;
      },
    },
    {
      id: "salary",
      header: () => <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Salary</span>,
      cell: ({ row }) => {
        const job = row.original;
        return <span className="text-sm text-gray-500">{formatSalary(job.salary_min, job.salary_max)}</span>;
      },
    },
    {
      accessorKey: "candidate_count",
      header: ({ column }) => {
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            Candidates
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => {
        const count = row.getValue("candidate_count") as number;
        return <span className="text-sm font-medium text-gray-900">{count}</span>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const job = row.original;

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
              <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditJob?.(job)}>
                Edit job
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this job?")) {
                    deleteJobMutation.mutate(job.id);
                  }
                }}
              >
                Delete job
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
          placeholder="Filter jobs..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("title")?.setFilterValue(event.target.value)}
          className="max-w-sm border border-gray-200 rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="border border-gray-200 text-gray-700 rounded-md h-9 px-4 text-sm hover:bg-gray-50">
              Columns
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
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
                  {isLoading ? "Loading..." : "No jobs found."}
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
