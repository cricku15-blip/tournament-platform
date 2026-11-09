import * as React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available.",
  className,
  renderMobileCard,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-card border border-line bg-card p-8 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop view: Table with sticky header */}
      <div className={cn("overflow-x-auto rounded-card border border-line bg-card", renderMobileCard && "hidden sm:block")}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur-xs font-semibold text-ink">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-sm font-semibold select-none",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                className="transition-colors hover:bg-surface/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3.5 text-ink",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view: Stacked cards */}
      {renderMobileCard && (
        <div className="flex flex-col gap-3 sm:hidden">
          {data.map((row, index) => (
            <div
              key={keyExtractor(row, index)}
              className="rounded-card border border-line bg-card p-4 transition-colors hover:bg-surface/40"
            >
              {renderMobileCard(row, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
