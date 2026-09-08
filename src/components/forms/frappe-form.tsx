import * as React from "react";
import { cn } from "@/utils/cn";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type FormFieldMeta,
  type FormValues,
  FrappeLinkField,
  splitOptions,
} from "./field-primitives";

/**
 * Client-side mirror of ERPNext `fetch_from` (source.link -> field.fieldname).
 */
function applyFetch(meta: FormFieldMeta, values: FormValues, row?: FormValues): unknown {
  const f = meta.fetch_from;
  if (!f) return undefined;
  const [srcField, srcKey] = f.split(".");
  const src = values[srcField] ?? row?.[srcField];
  if (src && typeof src === "object") return (src as Record<string, unknown>)[srcKey];
  return undefined;
}

/**
 * Renders a single form field from its ERPNext-style metadata.
 *
 *  - Blank/invalid fields are skipped
 *  - read_only     -> static read-only text
 *  - Section/Column breaks are layout hints handled by <FrappeForm/>
 *  - fetch_from    -> copies a value from a selected Link in the same row
 *                       (lightweight client-side mirror; server stays truth)
 */
export function FieldRenderer({
  meta,
  values,
  onChange,
  errors,
  readOnly,
  fetchValues,
  hideLabel,
}: {
  meta: FormFieldMeta;
  values: FormValues;
  onChange: (fieldname: string, value: any) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
  fetchValues?: FormValues;
  /** Skip the field's own label — for contexts that already show it elsewhere (e.g. a table column header). */
  hideLabel?: boolean;
}) {
  const { fieldname, fieldtype } = meta;
  const label = meta.label ?? fieldname.replace(/_/g, " ");

  if (fieldtype === "Section Break" || fieldtype === "Column Break") return null;

  const disabled = readOnly || meta.read_only;
  const error = errors?.[fieldname];
  const raw = values[fieldname];

  const fetched = !meta.read_only && !raw ? (applyFetch(meta, values, fetchValues) as any) : undefined;
  const value = raw ?? fetched;

  let input: React.ReactNode;
  switch (fieldtype) {
    case "Data":
    case "Date":
    case "Datetime":
      input = (
        <Input
          type={fieldtype === "Date" ? "date" : fieldtype === "Datetime" ? "datetime-local" : "text"}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(fieldname, e.target.value)}
          error={error}
          placeholder={meta.placeholder}
        />
      );
      break;
    case "Int":
    case "Float":
    case "Currency":
      input = (
        <Input
          type="number"
          step={fieldtype === "Int" ? "1" : "any"}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(fieldname, e.target.value === "" ? null : Number(e.target.value))}
          error={error}
          placeholder={meta.placeholder}
        />
      );
      break;
    case "Select": {
      const options = splitOptions(meta.options);
      input = (
        <Select value={value ?? ""} disabled={disabled} onChange={(e) => onChange(fieldname, e.target.value)} error={error}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
      break;
    }
    case "Link":
      input = (
        <FrappeLinkField meta={meta} value={value ?? ""} onChange={(v) => onChange(fieldname, v)} disabled={disabled} />
      );
      break;
    case "Check":
      input = (
        <Checkbox checked={Boolean(value)} disabled={disabled} onChange={(e) => onChange(fieldname, e.target.checked ? 1 : 0)} label={label} />
      );
      break;
    case "Text":
    case "Text Editor":
      input = (
        <Textarea
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(fieldname, e.target.value)}
          placeholder={meta.placeholder}
          className={cn("w-full", error && "border-destructive focus-visible:ring-destructive", fieldtype === "Text Editor" && "min-h-[120px] font-mono")}
        />
      );
      break;
    default:
      input = (
        <Input value={value ?? ""} disabled={disabled} onChange={(e) => onChange(fieldname, e.target.value)} error={error} />
      );
  }

  return (
    <div className={cn("space-y-1", fieldtype === "Check" && "pt-5")}>
      {fieldtype !== "Check" && !hideLabel && (
        <Label required={meta.reqd}>{label}</Label>
      )}
      {input}
      {meta.description && !error && <p className="text-xs text-muted-foreground">{meta.description}</p>}
    </div>
  );
}

export interface FrappeFormProps {
  fields: FormFieldMeta[];
  values: FormValues;
  onChange: (fieldname: string, value: any) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
  /** Per-row link data used to resolve fetch_from defaults. */
  links?: Record<string, unknown>;
  children?: React.ReactNode;
}

/**
 * Generic ERPNext-style form engine. Lays fields out into sections with a
 * responsive 2-column grid whenever a Column Break is encountered.
 */
export function FrappeForm({
  fields,
  values,
  onChange,
  errors,
  readOnly,
  links,
  children,
}: FrappeFormProps) {
  const groups = transformLayout(fields);
  return (
    <div className="space-y-6">
      {groups.map((section, si) => (
        <section key={si} className="space-y-3">
          {section.title && (
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-4 w-1 rounded-full bg-primary" />
              {section.title}
            </h3>
          )}
          {section.columns.map((col, ci) => (
            <div
              key={ci}
              className={cn(
                "grid gap-x-6 gap-y-4",
                section.columns.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1",
              )}
            >
              {col.flatMap((meta) => {
                if (meta.hidden || meta.depends_on) return [];
                if (meta.read_only && !meta.fetch_if_empty) {
                  return [
                    <div key={meta.fieldname} className="space-y-1">
                      <Label>{meta.label}</Label>
                      <div className="flex h-9 items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground">
                        {formatReadonly(meta, values[meta.fieldname])}
                      </div>
                    </div>,
                  ];
                }
                return [
                  <FieldRenderer
                    key={meta.fieldname}
                    meta={meta}
                    values={values}
                    onChange={onChange}
                    errors={errors}
                    readOnly={readOnly}
                    fetchValues={links}
                  />,
                ];
              })}
            </div>
          ))}
        </section>
      ))}
      {children}
    </div>
  );
}

function formatReadonly(meta: FormFieldMeta, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (meta.fieldtype === "Check") return value ? "Yes" : "No";
  return String(value);
}

type LayoutColumn = FormFieldMeta[];
type LayoutSection = { title?: string; columns: LayoutColumn[] };

/** Convert linear ERPNext field_order (Section/Column breaks) into layout groups. */
export function transformLayout(fields: FormFieldMeta[]): LayoutSection[] {
  const sections: LayoutSection[] = [];
  let current: LayoutSection | null = null;
  let column: FormFieldMeta[] = [];

  const finishColumn = () => {
    if (column.length && current) {
      current.columns.push(column);
      column = [];
    }
  };
  const ensure = () => {
    if (!current) {
      current = { title: undefined, columns: [] };
      sections.push(current);
    }
  };

  fields.forEach((f) => {
    switch (f.fieldtype) {
      case "Section Break":
        finishColumn();
        current = { title: f.label || undefined, columns: [] };
        sections.push(current);
        break;
      case "Column Break":
        finishColumn();
        break;
      default:
        ensure();
        column.push(f);
    }
  });
  finishColumn();
  // Assign app/section field to render in a single column if empty.
  sections.forEach((s) => {
    if (s.columns.length === 0) s.columns.push([]);
  });
  return sections;
}
