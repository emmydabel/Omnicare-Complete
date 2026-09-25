"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { EmptyState, TableSkeleton } from "./EmptyState";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  error: string | null;
  count: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  ordering: string | null;
  onToggleSort: (key: string) => void;
  filterOptions?: { param: string; options: { value: string; label: string }[] };
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  rowKey?: keyof T;
  emptyTitle?: string;
  emptySubtitle?: string;
  searchPlaceholder?: string;
}

export function DataTable<T>({
  columns, data, loading, error, count, page, totalPages, onPageChange,
  searchInput, onSearchChange, ordering, onToggleSort,
  filterOptions, filterValue, onFilterChange,
  rowKey = "id" as keyof T, emptyTitle, emptySubtitle, searchPlaceholder = "Search...",
}: DataTableProps<T>) {
  const cell = (row: T, key: string): ReactNode => (row as unknown as Record<string, ReactNode>)[key];
  const rowIdentity = (row: T): string => String((row as unknown as Record<string, unknown>)[rowKey as string]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>
        {filterOptions && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
            <button
              onClick={() => onFilterChange?.("")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                !filterValue ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {filterOptions.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFilterChange?.(opt.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterValue === opt.value ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-4">
          <TableSkeleton />
        </div>
      ) : error ? (
        <div className="p-4">
          <EmptyState icon={AlertTriangle} title="Couldn't load this data" subtitle={error} />
        </div>
      ) : data.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={Search} title={emptyTitle || "No matching records"} subtitle={emptySubtitle || "Try a different search term or filter."} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {columns.map((col) => {
                  const sortDir = ordering === col.key ? "ascending" : ordering === `-${col.key}` ? "descending" : col.sortable ? "none" : undefined;
                  return (
                    <th
                      key={col.key}
                      aria-sort={sortDir as "ascending" | "descending" | "none" | undefined}
                      className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      {col.sortable ? (
                        <button onClick={() => onToggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-slate-800">
                          {col.label}
                          <ArrowUpDown className={`h-3 w-3 ${sortDir === "ascending" || sortDir === "descending" ? "text-teal-600" : ""}`} aria-hidden="true" />
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={rowIdentity(row)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                      {col.render ? col.render(row) : cell(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {loading ? "Loading…" : (
            <>
              Showing <span className="font-semibold text-slate-700">{data.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{count}</span> records
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page === 1 || loading}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="px-2 text-xs font-semibold text-slate-600" aria-live="polite">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
