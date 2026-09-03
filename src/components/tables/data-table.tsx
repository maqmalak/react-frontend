import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Columns3,
  Download,
  Search,
} from "lucide-react";
import { cn, asNumber } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, type DropdownItem } from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { exportToExcel, exportToCsv } from "@/utils/export";

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  /** Used for sorting and export. Falls back to row[key]. */
  getValue?: (row: T) => string | number | undefined | null;
  headerClassName?: string;
  cellClassName?: string;
}

export interface FrappeDataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => DropdownItem[];
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  bulkActions?: (selected: T[]) => DropdownItem[];
  filters?: ReactNode;
  toolbar?: ReactNode;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  exportFilename?: string;
  defaultSortKey?: string;
}

function cellValue<T>(row: T, col: ColumnDef<T>): string | number | undefined | null {
  if (col.getValue) return col.getValue(row);
  const v = (row as Record<string, unknown>)[col.key];
  return typeof v === "string" || typeof v === "number" ? v : null;
}

export function FrappeDataTable<T extends Record<string, any>>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  searchable = true,
  searchPlaceholder = "Search…",
  onRowClick,
  rowActions,
  selectable,
  selectedKeys,
  onSelectionChange,
  bulkActions,
  filters,
  toolbar,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  title,
  subtitle,
  emptyTitle = "No records found",
  emptyDescription,
  exportFilename,
  defaultSortKey,
}: FrappeDataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    defaultSortKey ? { key: defaultSortKey, dir: "asc" } : null,
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.key));
  const searchableText = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!searchableText) return rows;
    return rows.filter((row) =>
      columns.some((c) => String(cellValue(row, c) ?? "").toLowerCase().includes(searchableText)),
    );
  }, [rows, columns, searchableText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = asNumber(cellValue(a, col));
      const bv = asNumber(cellValue(b, col));
      let cmp = av - bv;
      if (cmp === 0) {
        cmp = String(cellValue(a, col) ?? "").localeCompare(String(cellValue(b, col) ?? ""));
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const from = total === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(total, safePage * pageSize + pageSize);

  const allSelected =
    selectable && selectedKeys != null && pageRows.length > 0 && pageRows.every((r) => selectedKeys.has(rowKey(r)));
  const toggleAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys ?? []);
    if (allSelected) pageRows.forEach((r) => next.delete(rowKey(r)));
    else pageRows.forEach((r) => next.add(rowKey(r)));
    onSelectionChange(next);
  };
  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys ?? []);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };
  const selectedRows = selectedKeys ? (rows ?? []).filter((r) => selectedKeys.has(rowKey(r))) : [];

  const handleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(0);
  };
  const toggleColumn = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const changePageSize = (size: number) => {
    setPageSize(size);
    setPage(0);
  };

  const exportColumns = visibleColumns.map((c) => ({ key: c.key, label: c.label }));
  const exportRows = sorted.map((row) =>
    Object.fromEntries(visibleColumns.map((c) => [c.key, cellValue(row, c) ?? ""])),
  );

  const spanCount =
    visibleColumns.length + (selectable ? 1 : 0) + (rowActions || onRowClick ? 1 : 0);

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {selectable && selectedRows.length > 0 && bulkActions && (
            <DropdownMenu
              trigger={
                <Button variant="outline" size="sm">
                  Bulk ({selectedRows.length}) <ChevronDown className="h-4 w-4" />
                </Button>
              }
              items={bulkActions(selectedRows)}
            />
          )}
          {searchable && (
            <div className="relative flex-1">
              <label htmlFor="table-search" className="mb-1 block text-xs font-medium text-muted-foreground">
                Search
              </label>
              <Search className="pointer-events-none absolute left-2.5 bottom-2 h-4 w-4 text-muted-foreground" />
              <Input
                id="table-search"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="h-8 w-48 pl-8 text-xs lg:w-56"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          <DropdownMenu
            trigger={
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4" /> Columns
              </Button>
            }
            items={columns.map((c) => ({
              label: c.label,
              onClick: () => toggleColumn(c.key),
              disabled: visibleColumns.length <= 1 && !hiddenCols.has(c.key),
            }))}
            width="w-56"
          />
          {exportFilename && (
            <DropdownMenu
              trigger={
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" /> Export
                </Button>
              }
              items={[
                { label: "Export to CSV", onClick: () => exportToCsv(exportColumns, exportRows, exportFilename) },
                { label: "Export to Excel", onClick: () => exportToExcel(exportColumns, exportRows, exportFilename) },
              ]}
            />
          )}
        </div>
      </div>

      {filters}
{/* Table */}
      <div className="overflow-x-auto rounded-md border border-border scrollbar-thin">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all rows" />
                </th>
              )}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-xs font-semibold text-muted-foreground",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.headerClassName,
                    col.sortable !== false ? "cursor-pointer select-none" : "",
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sort?.key === col.key ? (
                      sort.dir === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      col.sortable !== false && <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
              {(rowActions || onRowClick) && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border last:border-0">
                  <td colSpan={spanCount} className="px-3 py-2">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={spanCount} className="px-4 py-4">
                  <ErrorState error={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={spanCount} className="p-4">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border last:border-0",
                    onRowClick && "cursor-pointer transition-colors hover:bg-muted/40",
                  )}
                >
                  {selectable && (
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedKeys?.has(rowKey(row)) ?? false}
                        onChange={() => toggleRow(rowKey(row))}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2",
                        col.align === "right"
                          ? "text-right tabular-nums"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left",
                        col.cellClassName,
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                  {(rowActions || onRowClick) && (
                    <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions && (
                        <DropdownMenu
                          trigger={
                            <button
                              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                              aria-label="Row actions"
                            >
                              <MoreGlyph />
                            </button>
                          }
                          items={rowActions(row)}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
{/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{" "}
            <span className="font-medium">{total}</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Rows</span>
              <select
                className="h-7 rounded border border-input bg-transparent text-xs"
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
              >
                {pageSizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4rem] text-center text-xs tabular-nums">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MoreGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}
