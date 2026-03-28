import { cn } from "@/lib/utils";

export interface SegmentedTabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** When true, tab is visible but not selectable */
  disabled?: boolean;
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  items: SegmentedTabItem<T>[];
  onValueChange: (value: T) => void;
  className?: string;
  /** `pill` = filled track; `minimal` = simple underline tabs */
  variant?: "pill" | "minimal";
}

export function SegmentedTabs<T extends string>({
  value,
  items,
  onValueChange,
  className,
  variant = "pill",
}: SegmentedTabsProps<T>) {
  if (variant === "minimal") {
    return (
      <div
        className={cn("flex flex-wrap items-center gap-6 border-b border-gray-200", className)}
        role="tablist"
        aria-label="Sections"
      >
        {items.map((item) => {
          const isDisabled = Boolean(item.disabled);
          const isActive = item.value === value && !isDisabled;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              disabled={isDisabled}
              aria-selected={isActive}
              aria-disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) onValueChange(item.value);
              }}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2 text-[14px] transition-colors",
                isDisabled && "cursor-not-allowed opacity-40",
                isActive
                  ? "border-gray-900 font-medium text-gray-900"
                  : !isDisabled && "border-transparent text-gray-500 hover:text-gray-800",
                isDisabled && "border-transparent text-gray-400"
              )}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span className="text-gray-400 tabular-nums">{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-[10px] bg-gray-100 p-1",
        className
      )}
      role="tablist"
      aria-label="Sections"
    >
      {items.map((item) => {
        const isDisabled = Boolean(item.disabled);
        const isActive = item.value === value && !isDisabled;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            disabled={isDisabled}
            aria-selected={isActive}
            aria-disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) onValueChange(item.value);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-[10px] px-2 py-1 text-[14px] font-medium transition-colors leading-[1.2]",
              isDisabled && "cursor-not-allowed opacity-40",
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : !isDisabled && "text-gray-600 hover:text-gray-900",
              isDisabled && "text-gray-400"
            )}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                  isActive ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-600"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

