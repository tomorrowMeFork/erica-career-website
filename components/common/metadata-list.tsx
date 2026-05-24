import * as React from "react";

import { cn } from "../../lib/utils.js";

export type MetadataListRow = {
  label: string;
  value?: React.ReactNode | null;
  dateTime?: string;
};

type MetadataListProps = React.ComponentProps<"dl"> & {
  rows: MetadataListRow[];
  emptyFallback?: React.ReactNode;
};

export function MetadataList({ rows, emptyFallback = null, className, ...props }: MetadataListProps) {
  const visibleRows = rows.filter((row) => hasValue(row.value));

  if (visibleRows.length === 0) return emptyFallback;

  return (
    <dl className={cn("grid gap-0 overflow-hidden border erica-surface-muted text-sm", className)} {...props}>
      {visibleRows.map((row, index) => (
        <React.Fragment key={`${row.label}-${index}`}>
          <div className={cn("grid gap-1 px-3 py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4", index > 0 ? "border-t border-border/70" : null)}>
            <dt className="font-medium text-[var(--hanyang-gold)]">{row.label}</dt>
            <dd className="min-w-0 text-foreground">{renderValue(row)}</dd>
          </div>
        </React.Fragment>
      ))}
    </dl>
  );
}

function renderValue(row: MetadataListRow): React.ReactNode {
  if (row.dateTime === undefined) return row.value;
  return <time dateTime={row.dateTime}>{row.value}</time>;
}

function hasValue(value: React.ReactNode | null | undefined): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}
