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
import {
  IconArrowsSort,
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteCandidate } from "@/hooks/useCandidates";
import type { CandidateListItem } from "@/types/candidate";

interface CandidatesDataTableProps {
  data: CandidateListItem[];
  isLoading?: boolean;
  onCreateCandidate?: () => void;
  onEditCandidate?: (candidate: CandidateListItem) => void;
  onUpload?: () => void;
}

export function CandidatesDataTable({
  data,
  isLoading,
  onCreateCandidate,
  onEditCandidate,
  onUpload,
}: CandidatesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      skills: false,
      latest_application_status: false,
    });

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
      id: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Name
          <IconArrowsSort className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{getFullName(row.original)}</span>
      ),
      sortingFn: (rowA, rowB) => {
        return getFullName(rowA.original).localeCompare(
          getFullName(rowB.original)
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.getValue("email") as string;
        return email ? (
          <span>{email}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.getValue("location") as string;
        return (
          <span className="text-muted-foreground">{location || "—"}</span>
        );
      },
    },
    {
      accessorKey: "skills",
      header: "Skills",
      cell: ({ row }) => {
        const skills = row.getValue("skills") as string[];
        if (!skills || skills.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 2).map((skill, index) => (
              <span
                key={index}
                className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs"
              >
                {skill}
              </span>
            ))}
            {skills.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{skills.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "experience_years",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Experience
          <IconArrowsSort className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const years = row.getValue("experience_years") as number;
        if (!years)
          return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-muted-foreground">
            {years} year{years !== 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "latest_application_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("latest_application_status") as string;
        if (!status) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs capitalize">
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Added
          <IconArrowsSort className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-muted-foreground">{formatDate(date)}</span>
        );
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
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground data-[state=open]:bg-muted"
              >
                <IconDotsVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => navigate(`/candidates/${candidate.id}`)}
              >
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditCandidate?.(candidate)}>
                Edit candidate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to delete this candidate?"
                    )
                  ) {
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search candidates..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="h-9 w-64"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {onUpload && (
            <Button variant="outline" size="sm" onClick={onUpload}>
              <IconUpload className="size-4" />
              Upload
            </Button>
          )}
          {onCreateCandidate && (
            <Button size="sm" onClick={onCreateCandidate}>
              <IconPlus className="size-4" />
              Add Candidate
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {isLoading ? "Loading..." : "No candidates found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} candidate(s) total.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
