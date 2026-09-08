import * as React from "react";
import { Columns3, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { type FormFieldMeta } from "@/components/forms/field-primitives";
import { FieldRenderer } from "@/components/forms/frappe-form";

export type ChildRow = Record<string, any>;

export interface EditableChildTableProps {
  columns: FormFieldMeta[];
  rows: ChildRow[];
  onChange: (index: number, fieldname: string, value: any) => void;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  onDuplicateRow?: (index: number) => void;
  /** Called when a Link column value changes (used to fetch item_name etc.). */
  onLinkChange?: (index: number, fieldname: string, value: string) => void;
  /** Extra derived values per row (e.g. amount) rendered read-only. */
  renderCell?: (row: ChildRow, col: FormFieldMeta) => React.ReactNode | undefined;
  /** Rendered as sticky totals below the table. */
  totals?: { label: string; value: React.ReactNode; align?: "left" | "right" }[];
  readOnly?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Adds a row-selection checkbox column plus a "Delete Selected" bulk action (desktop only). */
  selectable?: boolean;
  /** Adds a per-row edit icon (desktop only) that opens the row's fields in a dialog — handy when there are more columns than fit comfortably in the grid. */
  editableInDialog?: boolean;
  /** Extra fields shown only in the row-edit dialog, on top of `columns` — for less-used fields that don't need a permanent grid column. */
  extraDialogColumns?: FormFieldMeta[];
  /** Adds a "Columns" button to show/hide inline grid columns (desktop only). Hidden columns still appear in the row-edit dialog. */
  columnPicker?: boolean;
}

/**
 * Editable child-table grid.
 *
 * Features: inline editing, add/delete/duplicate rows, horizontal scroll, a
 * responsive card layout on small screens, and sticky totals.
 */
export function EditableChildTable({
  columns,
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
  onDuplicateRow,
  onLinkChange,
  renderCell,
  totals,
  readOnly,
  emptyMessage = "No rows yet. Click Add Row to begin.",
  className,
  selectable,
  editableInDialog,
  extraDialogColumns,
  columnPicker,
}: EditableChildTableProps) {
  const linkFieldnames = React.useMemo(
    () => columns.filter((c) => c.fieldtype === "Link").map((c) => c.fieldname),
    [columns],
  );
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [hiddenFields, setHiddenFields] = React.useState<Set<string>>(new Set());

  const visibleColumns = React.useMemo(
    () => columns.filter((c) => !hiddenFields.has(c.fieldname)),
    [columns, hiddenFields],
  );
  const dialogColumns = React.useMemo(
    () => [...columns, ...(extraDialogColumns ?? [])],
    [columns, extraDialogColumns],
  );

  const toggleField = (fieldname: string) =>
    setHiddenFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldname)) next.delete(fieldname);
      else next.add(fieldname);
      return next;
    });

  const toggleRow = (i: number) =>
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const deleteSelected = () => {
    if (!onRemoveRow) return;
    Array.from(selectedRows)
      .sort((a, b) => b - a)
      .forEach((i) => onRemoveRow(i));
    setSelectedRows(new Set());
  };

  return (
    <div className={cn("space-y-3", className)}>
      {(onAddRow || columnPicker || (!readOnly && selectable && selectedRows.size > 0)) && (
        <div className="flex items-center justify-end gap-2">
          {!readOnly && selectable && selectedRows.size > 0 && onRemoveRow && (
            <Button variant="outline" size="sm" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4" /> Delete Selected ({selectedRows.size})
            </Button>
          )}
          {columnPicker && (
            <DropdownMenu
              trigger={
                <Button variant="outline" size="sm">
                  <Columns3 className="h-4 w-4" /> Columns
                </Button>
              }
              items={columns.map((c) => {
                const hidden = hiddenFields.has(c.fieldname);
                return {
                  label: c.label ?? c.fieldname,
                  icon: hidden ? (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  ),
                  onClick: () => toggleField(c.fieldname),
                  disabled: visibleColumns.length <= 1 && !hidden,
                };
              })}
              width="w-56"
            />
          )}
          {!readOnly && onAddRow && (
            <Button variant="outline" size="sm" onClick={onAddRow}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden overflow-x-auto rounded-md border border-border md:block scrollbar-thin">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="sticky left-0 z-10 w-28 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {selectable && (
                        <input
                          type="checkbox"
                          className="accent-primary"
                          aria-label="Select all rows"
                          checked={rows.length > 0 && selectedRows.size === rows.length}
                          onChange={(e) =>
                            setSelectedRows(e.target.checked ? new Set(rows.map((_, i) => i)) : new Set())
                          }
                        />
                      )}
                      Actions
                    </div>
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.fieldname}
                      className="min-w-[110px] whitespace-nowrap px-3 py-2 text-xs font-semibold text-muted-foreground"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.__uuid ?? i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-card px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        {selectable && (
                          <input
                            type="checkbox"
                            className="accent-primary mr-0.5"
                            aria-label={`Select row ${i + 1}`}
                            checked={selectedRows.has(i)}
                            onChange={() => toggleRow(i)}
                          />
                        )}
                        {editableInDialog && (
                          <button
                            title="Edit row"
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={() => setEditingIndex(i)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!readOnly && onDuplicateRow && (
                          <button
                            title="Duplicate row"
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={() => onDuplicateRow(i)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!readOnly && onRemoveRow && (
                          <button
                            title="Delete row"
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onRemoveRow(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.fieldname} className="px-1 py-1.5">
                        {renderCell?.(row, col) ?? (
                          <FieldRenderer
                            meta={{ ...col, read_only: col.read_only || readOnly }}
                            values={row}
                            hideLabel
                            onChange={(fieldname, value) => {
                              onChange(i, fieldname, value);
                              if (linkFieldnames.includes(fieldname)) {
                                onLinkChange?.(i, fieldname, value ?? "");
                              }
                            }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {rows.map((row, i) => (
              <div key={row.__uuid ?? i} className="rounded-md border border-border p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Row {i + 1}</span>
                  <div className="flex gap-1">
                    {!readOnly && onDuplicateRow && (
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-accent"
                        onClick={() => onDuplicateRow(i)}
                        aria-label="Duplicate row"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    {!readOnly && onRemoveRow && (
                      <button
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onRemoveRow(i)}
                        aria-label="Delete row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {columns.map((col) => {
                    const custom = renderCell?.(row, col);
                    return (
                      <div key={col.fieldname}>
                        {custom ? (
                          <>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {col.label}
                            </label>
                            {custom}
                          </>
                        ) : (
                          <FieldRenderer
                            meta={{ ...col, read_only: col.read_only || readOnly }}
                            values={row}
                            onChange={(fieldname, value) => {
                              onChange(i, fieldname, value);
                              if (linkFieldnames.includes(fieldname)) {
                                onLinkChange?.(i, fieldname, value ?? "");
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {totals && totals.length > 0 && rows.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-muted/30">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2 text-sm">
            {totals.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t.label}:</span>
                <span className="font-semibold tabular-nums">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editableInDialog && editingIndex !== null && rows[editingIndex] && (
        <Dialog open onClose={() => setEditingIndex(null)} title={`Row ${editingIndex + 1}`} size="lg">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dialogColumns.map((col) => {
              const custom = renderCell?.(rows[editingIndex], col);
              return (
                <div key={col.fieldname}>
                  {custom ? (
                    <>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {col.label}
                      </label>
                      {custom}
                    </>
                  ) : (
                    <FieldRenderer
                      meta={{ ...col, read_only: col.read_only || readOnly }}
                      values={rows[editingIndex]}
                      onChange={(fieldname, value) => {
                        onChange(editingIndex, fieldname, value);
                        if (linkFieldnames.includes(fieldname)) {
                          onLinkChange?.(editingIndex, fieldname, value ?? "");
                        }
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            {!readOnly && onRemoveRow ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onRemoveRow(editingIndex);
                  setEditingIndex(null);
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete Row
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={() => setEditingIndex(null)}>
              Done
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}