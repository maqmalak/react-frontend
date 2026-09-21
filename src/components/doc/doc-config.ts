import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ColumnDef } from "@/components/tables/data-table";
import type { FormFieldMeta } from "@/components/forms/field-primitives";
import type { ChildRow } from "@/components/tables/child-table";
import type { STAT_TONES } from "@/components/common/stat-card";

/**
 * Config for the generic list / form pages (DocListPage, DocFormPage).
 *
 * A DocType becomes a full management screen — status tabs, filters, server-side search and paging,
 * create / edit / submit / cancel / delete, editable child tables, live calculations — by describing
 * it here instead of writing a 400-line page. Field metadata (`FormFieldMeta`) is the same shape
 * the rest of the app's forms already use.
 */

export type DocValues = Record<string, any>;
export type ChildRows = Record<string, ChildRow[]>;

/** A form field that can also be conditionally shown (FrappeForm itself ignores `depends_on`). */
export type DocField = FormFieldMeta & { showIf?: (values: DocValues) => boolean };

export interface SummaryItem {
  label: string;
  value: ReactNode;
  tone?: keyof typeof STAT_TONES;
}

export interface ChildTableSpec {
  /** Fieldname of the Table field on the parent, e.g. "items". */
  key: string;
  label: string;
  description?: string;
  /** Child DocType — sent as `doctype` on new rows. */
  doctype: string;
  columns: FormFieldMeta[];
  /** Extra fields shown only in the row-edit dialog. */
  dialogColumns?: FormFieldMeta[];
  /** Table is calculated / system-managed: shown, never edited. */
  readOnly?: boolean;
  /** At least this many rows are required to save. */
  minRows?: number;
  /** Defaults for a newly added row. */
  newRow?: (values: DocValues, rows: ChildRow[]) => ChildRow;
  /** Fill other row fields when a Link column changes (e.g. item_code → item_name, uom). */
  linkEffects?: Record<string, (value: string, row: ChildRow, values: DocValues) => Promise<ChildRow | void> | ChildRow | void>;
  /** Footer totals under the grid. */
  totals?: (rows: ChildRow[]) => { label: string; value: ReactNode; align?: "left" | "right" }[];
  /** Show the column picker / row dialog for wide tables. */
  wide?: boolean;
  /** Only show (and validate) this table when true. */
  showIf?: (values: DocValues) => boolean;
}

/** A patch to the form: header values, and/or whole child tables (keyed by the Table fieldname). */
export type FormPatch = DocValues;

export interface ExtraContext {
  name?: string;
  isNew: boolean;
  docstatus?: number;
  readOnly: boolean;
  values: DocValues;
  rows: ChildRows;
  reload: () => void;
  /** Apply a patch — keys that name a child table replace that table's rows, the rest are header values. */
  patch: (patch: FormPatch) => void;
}

export interface DocConfig {
  doctype: string;
  /** URL base, e.g. "/production/work-orders" (list) — form lives at `${base}/:name` and `${base}/new`. */
  base: string;
  singular: string;
  plural: string;
  subtitle: string;
  icon: LucideIcon;
  submittable?: boolean;

  // ---- list ------------------------------------------------------------------------------------
  listFields: string[];
  columns: ColumnDef<any>[];
  /** DB fields the search box matches (`like %text%`). */
  searchFields: string[];
  sort?: { key: string; dir: "asc" | "desc" };
  /** Field whose values become the status tabs (with live counts). */
  statusField?: string;
  statuses?: string[];
  /** Date filter (from / to) on this field. */
  dateField?: string;
  dateLabel?: string;
  /** Extra dropdown filters — fixed `options`, or `optionsFrom` a DocType whose names are listed. */
  filters?: { field: string; label: string; options?: string[]; optionsFrom?: string }[];
  /** Always applied (e.g. hide template tasks). */
  baseFilters?: unknown[][];
  /** Company-scoped? Defaults to true when the form has a `company` field. */
  companyScoped?: boolean;
  /** Extra UI above the table (e.g. a view switcher). */
  listHeaderExtra?: ReactNode;

  // ---- form ------------------------------------------------------------------------------------
  fields: DocField[];
  children?: ChildTableSpec[];
  /** Defaults for a new document. */
  defaults?: (ctx: { company?: string; params: URLSearchParams }) => DocValues;
  /** Cards shown above the form. */
  summary?: (values: DocValues, rows: ChildRows) => SummaryItem[];
  /** Live calculation: called after every edit; return patches for header values and/or child rows. */
  compute?: (values: DocValues, rows: ChildRows) => { values?: DocValues; rows?: ChildRows } | void;
  /** Fill other fields when a header Link/Select changes. The returned patch may also carry child tables (by Table fieldname). */
  linkEffects?: Record<string, (value: any, values: DocValues) => Promise<FormPatch | void> | FormPatch | void>;
  /** Extra sections rendered below the form (panels, related lists…). */
  extra?: (ctx: ExtraContext) => ReactNode;
  /** Text under the page title on the form. */
  titleOf?: (values: DocValues) => string;
  /** Business rules beyond "required": return { field: message }. */
  validate?: (values: DocValues, rows: ChildRows) => Record<string, string>;
  /** Fields that must not be sent back on save (server-managed). */
  omitOnSave?: string[];
}
