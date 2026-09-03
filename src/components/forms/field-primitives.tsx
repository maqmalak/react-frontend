import * as React from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { Link as LinkIcon, Search, X } from "lucide-react";

/**
 * ERPNext-style form field metadata.
 * Mirrors the DocField attributes the Frappe server exposes via
 * /api/method/frappe.client.get_list(doctype="DocField"...) or the DocType JSON.
 */
export interface FormFieldMeta {
  fieldname: string;
  label?: string;
  fieldtype:
    | "Data"
    | "Select"
    | "Link"
    | "Dynamic Link"
    | "Date"
    | "Datetime"
    | "Currency"
    | "Float"
    | "Int"
    | "Check"
    | "Text"
    | "Text Editor"
    | "Attach"
    | "Attach Image"
    | "Table"
    | "Section Break"
    | "Column Break";
  options?: string;
  reqd?: boolean;
  read_only?: boolean;
  hidden?: boolean;
  depends_on?: string;
  mandatory_depends_on?: string;
  fetch_from?: string;
  fetch_if_empty?: boolean;
  default?: unknown;
  precision?: string | number;
  placeholder?: string;
  description?: string;
  in_list_view?: boolean;
  [key: string]: unknown;
}

export type FormValues = Record<string, any>;

/** Split Select options ("\n" separated) into a clean list (empty first = placeholder). */
export function splitOptions(options?: string): string[] {
  if (!options) return [];
  return options
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Resolve a `fetch_from` target from a selected parent value (same row). */
export function applyFetchFrom(
  meta: FormFieldMeta,
  values: FormValues,
  fallback: Record<string, unknown> = {},
): unknown {
  const f = meta.fetch_from;
  if (!f) return undefined;
  const [sourceField] = f.split(".");
  const current = values[sourceField] ?? fallback[sourceField];
  if (current && typeof current === "object") {
    const [, targetKey] = f.split(".");
    return (current as Record<string, unknown>)[targetKey];
  }
  return undefined;
}

/** Title / search fields per common link doctypes. */
const LINK_TITLE_FIELDS: Record<string, string> = {
  Customer: "customer_name",
  Supplier: "supplier_name",
  Item: "item_name",
  Employee: "employee_name",
  Company: "company_name",
  User: "full_name",
  Warehouse: "warehouse_name",
  "Sales Order": "name",
  "Purchase Order": "name",
};

function linkTitleField(doctype: string): string {
  return LINK_TITLE_FIELDS[doctype] ?? "name";
}

/** A link field with async search (DocType options). Loads on focus; searches as you type. */
export function FrappeLinkField({
  meta,
  value,
  onChange,
  disabled,
  onError,
  className,
  allowClear = true,
}: {
  meta: FormFieldMeta;
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onError?: (msg: string) => void;
  className?: string;
  allowClear?: boolean;
}) {
  const doctype = String(meta.options ?? "");
  const titleField = linkTitleField(doctype);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const limit = 25;
  const q = query.trim();

  const filters: unknown[][] = [];
  if (doctype === "Customer" || doctype === "Supplier" || doctype === "Item") {
    filters.push(["disabled", "=", 0]);
  }

  const orFilters: unknown[][] | undefined = q
    ? [
        ["name", "like", `%${q}%`],
        ...(titleField !== "name" ? [[titleField, "like", `%${q}%`] as unknown[]] : []),
      ]
    : undefined;

  const fields =
    titleField !== "name" ? (["name", titleField] as string[]) : (["name"] as string[]);

  const { data, error, isLoading } = useFrappeGetDocList<Record<string, any>>(
    doctype,
    {
      fields: fields as any,
      filters: filters as any,
      ...(orFilters ? { orFilters: orFilters as any } : {}),
      limit,
      orderBy: { field: titleField !== "name" ? titleField : "name", order: "asc" },
    },
    doctype && open ? `apparel.link.${doctype}.${q || "__all__"}` : null,
  );

  React.useEffect(() => {
    if (error && onError) onError(`Could not search ${doctype}`);
  }, [error, doctype, onError]);

  const results = (data ?? []).map((d) => {
    const title = titleField !== "name" ? d[titleField] : undefined;
    const label = title && title !== d.name ? `${title} (${d.name})` : String(d.name ?? "");
    return { value: String(d.name ?? ""), label };
  });

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="relative">
        <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={focused ? query : value ?? ""}
          placeholder={meta.placeholder ?? `Search ${meta.label ?? doctype}…`}
          disabled={disabled || !doctype}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setQuery("");
            setOpen(true);
          }}
          onBlur={() => {
            setFocused(false);
            setOpen(false);
            setQuery("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query) {
              e.preventDefault();
              onChange(query.trim());
              setOpen(false);
              setFocused(false);
            }
            if (e.key === "Escape") {
              setOpen(false);
              setFocused(false);
            }
          }}
        />
        {allowClear && value && (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              setQuery("");
            }}
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {isLoading && results.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</li>
          )}
          {!isLoading && results.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">No results</li>
          )}
          {results.map((r) => (
            <li key={r.value}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(r.value);
                  setOpen(false);
                  setFocused(false);
                  setQuery("");
                }}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
