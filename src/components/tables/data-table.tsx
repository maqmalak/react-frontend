import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Columns3,
  Download,
  Search,
  Eye,
  EyeOff,
  Printer,
} from "lucide-react";
import { cn, asNumber } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, type DropdownItem } from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { exportToExcel, exportToCsv, exportToXlsx } from "@/utils/export";
import { printRows } from "@/utils/print";

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
  /** Title shown on the printed page / PDF. Defaults to `title`. */
  printTitle?: string;
  /** Subtitle line shown under the print/PDF title. Defaults to `subtitle`. */
  printSubtitle?: string;
  defaultSortKey?: string;
  /** Column keys hidden on first render (still toggleable via the Columns picker). */
  defaultHiddenColumns?: string[];
  /** Tint alternate rows for easier scanning across wide/dense tables — opt-in, off by default so existing tables keep their look. */
  striped?: boolean;
  /** Pin the first N *visible* columns while the table scrolls horizontally — counted after `defaultHiddenColumns`/the Columns picker, so it always freezes what's actually shown. */
  frozenColumns?: number;
  /** A pre-aggregated row (e.g. the report's own server-computed Total) rendered as a bold footer through the same column pipeline as every other row — not re-derived from `rows`, so it stays correct under pagination/filtering. */
  totalRow?: T;
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
  printTitle,
  printSubtitle,
  defaultSortKey,
  defaultHiddenColumns,
  striped,
  frozenColumns,
  totalRow,
}: FrappeDataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    defaultSortKey ? { key: defaultSortKey, dir: "asc" } : null,
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set(defaultHiddenColumns ?? []));

  // Memoized: the frozen-column effect below depends on this array's
  // identity to know when to re-measure, so a fresh array every render
  // (this used to be a plain `.filter()` call) would re-run it in a loop.
  const visibleColumns = useMemo(() => columns.filter((c) => !hiddenCols.has(c.key)), [columns, hiddenCols]);
  const searchableText = query.trim().toLowerCase();

  const frozenCount = Math.min(frozenColumns ?? 0, visibleColumns.length);
  const headerCellRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const [frozenLefts, setFrozenLefts] = useState<number[]>([]);

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
  // Memoized for the same reason as visibleColumns above — a fresh `.slice()`
  // array every render would re-trigger the frozen-column measurement effect
  // on every render, forever.
  const pageRows = useMemo(
    () => sorted.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [sorted, safePage, pageSize],
  );
  const from = total === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(total, safePage * pageSize + pageSize);

  // Column widths are content-driven (no fixed table-layout), so the sticky
  // `left` offset for each frozen column has to be measured from the actual
  // rendered header cells rather than assumed — and re-measured whenever the
  // visible page's content could change those widths.
  useLayoutEffect(() => {
    if (!frozenCount) {
      setFrozenLefts([]);
      return;
    }
    const lefts: number[] = [];
    let acc = 0;
    for (let i = 0; i < frozenCount; i++) {
      lefts.push(acc);
      acc += headerCellRefs.current[i]?.getBoundingClientRect().width ?? 0;
    }
    setFrozenLefts(lefts);
  }, [frozenCount, visibleColumns, pageRows]);

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
            <div className="flex items-center gap-2">
              <label htmlFor="table-search" className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            </div>
          )}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
            <DropdownMenu
              trigger={
                <Button variant="ghost" size="sm" className="hover:bg-background hover:shadow-sm">
                  <Columns3 className="h-4 w-4 text-primary" /> Columns
                </Button>
              }
              items={columns.map((c) => {
                const hidden = hiddenCols.has(c.key);
                return {
                  label: c.label,
                  icon: hidden ? (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  ),
                  onClick: () => toggleColumn(c.key),
                  disabled: visibleColumns.length <= 1 && !hidden,
                };
              })}
              width="w-56"
            />
            {exportFilename && (
              <>
                <DropdownMenu
                  trigger={
                    <Button variant="ghost" size="sm" className="hover:bg-background hover:shadow-sm">
                      <Download className="h-4 w-4 text-primary" /> Export
                    </Button>
                  }
                  items={[
                    { label: "Export to CSV", onClick: () => exportToCsv(exportColumns, exportRows, exportFilename) },
                    { label: "Export to Excel (.xlsx)", onClick: () => exportToXlsx(exportColumns, exportRows, exportFilename) },
                    { label: "Export to Excel (legacy .xls)", onClick: () => exportToExcel(exportColumns, exportRows, exportFilename) },
                    {
                      label: "Export to PDF",
                      onClick: () =>
                        printRows(printTitle ?? title ?? exportFilename, exportColumns, exportRows, printSubtitle ?? subtitle),
                    },
                  ]}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-background hover:shadow-sm"
                  onClick={() =>
                    printRows(printTitle ?? title ?? exportFilename, exportColumns, exportRows, printSubtitle ?? subtitle)
                  }
                >
                  <Printer className="h-4 w-4 text-primary" /> Print
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {filters}
{/* Table */}
      <div className="overflow-x-auto rounded-md border border-border scrollbar-thin">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {selectable && (
                <th className="w-10 bg-muted px-3 py-2">
                  <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all rows" />
                </th>
              )}
              {visibleColumns.map((col, colIdx) => {
                const frozen = colIdx < frozenCount;
                return (
                  <th
                    key={col.key}
                    ref={(el) => {
                      headerCellRefs.current[colIdx] = el;
                    }}
                    className={cn(
                      "whitespace-nowrap bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.headerClassName,
                      col.sortable !== false ? "cursor-pointer select-none" : "",
                      frozen && "sticky z-20",
                      frozen && colIdx === frozenCount - 1 && "border-r border-border",
                    )}
                    style={frozen ? { left: frozenLefts[colIdx] ?? 0 } : undefined}
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
                );
              })}
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
              pageRows.map((row, i) => {
                // Frozen cells need their own *opaque* background — as a
                // sticky element they visually sit above cells from the same
                // row that have scrolled underneath them, so a transparent
                // background would let that scrolled-away content show
                // through. Solid `bg-accent` (not the `/40` tint the rest of
                // a striped row uses) is the cheapest way to stay opaque
                // while still reading as "the alternate row".
                const rowStriped = striped && i % 2 === 1;
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-border last:border-0",
                      rowStriped && "bg-accent/40",
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
                    {visibleColumns.map((col, colIdx) => {
                      const frozen = colIdx < frozenCount;
                      return (
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
                            frozen && "sticky z-10",
                            frozen && (rowStriped ? "bg-accent" : "bg-background"),
                            frozen && colIdx === frozenCount - 1 && "border-r border-border",
                          )}
                          style={frozen ? { left: frozenLefts[colIdx] ?? 0 } : undefined}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? "—")}
                        </td>
                      );
                    })}
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
                );
              })
            )}
          </tbody>
          {totalRow && !loading && !error && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/60 font-bold">
                {selectable && <td className="px-3 py-2" />}
                {visibleColumns.map((col, colIdx) => {
                  const frozen = colIdx < frozenCount;
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2",
                        col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left",
                        frozen && "sticky z-10 bg-muted",
                        frozen && colIdx === frozenCount - 1 && "border-r border-border",
                      )}
                      style={frozen ? { left: frozenLefts[colIdx] ?? 0 } : undefined}
                    >
                      {col.render
                        ? col.render(totalRow)
                        : String((totalRow as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  );
                })}
                {(rowActions || onRowClick) && <td className="px-2 py-2" />}
              </tr>
            </tfoot>
          )}
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
