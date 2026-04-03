import type { HTMLAttributes } from "react";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

/** Click header to cycle sort — matches shadcn data-table pattern (no extra filter menus per column). */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 data-[state=open]:bg-accent"
        onClick={column.getToggleSortingHandler()}
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="size-4 shrink-0" />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="size-4 shrink-0" />
        ) : (
          <ArrowUpDown className="size-4 shrink-0 opacity-50" />
        )}
      </Button>
    </div>
  );
}
