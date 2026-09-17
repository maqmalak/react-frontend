import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

/**
 * Global search (Ctrl/Cmd + K).
 *
 * Queries each doctype below directly (name + title field, `or_filters`)
 * instead of Frappe's generic `global_search.search` RPC. That RPC ranks
 * hits across *every* indexed doctype by raw frequency, so a term that
 * happens to appear inside thousands of unrelated documents (e.g. an Item
 * name quoted inside every Purchase Receipt that ordered it) can crowd the
 * one Item hit that actually matters out of the top N results entirely —
 * confirmed live: searching "BOTTLE" returned 20 Purchase Receipt hits and
 * zero Items, even though "BOTTLE BURSH" is a real Item. Querying each
 * doctype's own table directly guarantees a match there surfaces.
 * Results are permission-filtered by ERPNext on the server either way.
 */

interface SearchHit {
  doctype: string;
  name: string;
  label: string;
  route: string;
}

/** DocType -> { SPA route builder, field to search/display alongside `name` }. */
const SEARCH_DOCTYPES: Record<string, { route: (name: string) => string; titleField: string }> = {
  "LC Proforma": { route: (n) => `/export/lc-proforma/${encodeURIComponent(n)}`, titleField: "proforma_no" },
  "Export Shipment": { route: (n) => `/export/shipments/${encodeURIComponent(n)}`, titleField: "shipment_no" },
  "Import Shipment": { route: (n) => `/import/shipments/${encodeURIComponent(n)}`, titleField: "shipment_no" },
  "Import Cost Sheet": { route: (n) => `/import/cost-sheets/${encodeURIComponent(n)}`, titleField: "name" },
  "Sales Order": { route: (n) => `/export/orders/${encodeURIComponent(n)}`, titleField: "customer_name" },
  "Purchase Order": { route: () => `/import/purchase-orders`, titleField: "supplier_name" },
  Item: { route: () => `/masters/items`, titleField: "item_name" },
  Customer: { route: () => `/masters/customers`, titleField: "customer_name" },
  Supplier: { route: () => `/masters/suppliers`, titleField: "supplier_name" },
  "Work Order": { route: () => `/production/work-orders`, titleField: "production_item" },
  "Sales Invoice": { route: () => `/reports/export`, titleField: "customer_name" },
  "CRM Lead": { route: (n) => `/crm/leads/${encodeURIComponent(n)}`, titleField: "lead_name" },
  "CRM Deal": { route: (n) => `/crm/deals/${encodeURIComponent(n)}`, titleField: "organization" },
};

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Registers the Ctrl/Cmd+K shortcut and returns the open state. */
export function useGlobalSearchShortcut() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

/** One doctype's live-search results — `doctype` is a fixed literal per call site, never changes across renders. */
function useDoctypeSearch(doctype: string, titleField: string, query: string, enabled: boolean) {
  const q = query.trim();
  const active = enabled && q.length > 0;
  const fields = titleField === "name" ? ["name"] : ["name", titleField];
  const orFilters = [
    ["name", "like", `%${q}%`],
    ...(titleField !== "name" ? [[titleField, "like", `%${q}%`]] : []),
  ];

  const { data, isLoading } = useFrappeGetDocList<Record<string, unknown>>(
    doctype,
    { fields: fields as never, orFilters: orFilters as never, limit: 5 },
    active ? `micromax.search.${doctype}.${q}` : null,
  );

  return { doctype, titleField, data: data ?? [], isLoading: active && isLoading };
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const debounced = useDebounced(query.trim(), 250);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const enabled = open && debounced.length >= 2;

  // Fixed, unconditional set of hook calls — SEARCH_DOCTYPES is a static
  // compile-time map, never varies in size/order across renders, so this
  // doesn't violate the rules of hooks despite being "one call per doctype".
  const groups = [
    useDoctypeSearch("LC Proforma", SEARCH_DOCTYPES["LC Proforma"].titleField, debounced, enabled),
    useDoctypeSearch("Export Shipment", SEARCH_DOCTYPES["Export Shipment"].titleField, debounced, enabled),
    useDoctypeSearch("Import Shipment", SEARCH_DOCTYPES["Import Shipment"].titleField, debounced, enabled),
    useDoctypeSearch("Import Cost Sheet", SEARCH_DOCTYPES["Import Cost Sheet"].titleField, debounced, enabled),
    useDoctypeSearch("Sales Order", SEARCH_DOCTYPES["Sales Order"].titleField, debounced, enabled),
    useDoctypeSearch("Purchase Order", SEARCH_DOCTYPES["Purchase Order"].titleField, debounced, enabled),
    useDoctypeSearch("Item", SEARCH_DOCTYPES["Item"].titleField, debounced, enabled),
    useDoctypeSearch("Customer", SEARCH_DOCTYPES["Customer"].titleField, debounced, enabled),
    useDoctypeSearch("Supplier", SEARCH_DOCTYPES["Supplier"].titleField, debounced, enabled),
    useDoctypeSearch("Work Order", SEARCH_DOCTYPES["Work Order"].titleField, debounced, enabled),
    useDoctypeSearch("Sales Invoice", SEARCH_DOCTYPES["Sales Invoice"].titleField, debounced, enabled),
    useDoctypeSearch("CRM Lead", SEARCH_DOCTYPES["CRM Lead"].titleField, debounced, enabled),
    useDoctypeSearch("CRM Deal", SEARCH_DOCTYPES["CRM Deal"].titleField, debounced, enabled),
  ];

  const isLoading = groups.some((g) => g.isLoading);

  const results: SearchHit[] = React.useMemo(() => {
    if (!enabled) return [];
    const hits: SearchHit[] = [];
    groups.forEach((g) => {
      const meta = SEARCH_DOCTYPES[g.doctype];
      g.data.forEach((d) => {
        const name = String(d.name ?? "");
        if (!name) return;
        const title = g.titleField !== "name" ? (d[g.titleField] as string | undefined) : undefined;
        const label = title && title !== name ? `${title} (${name})` : name;
        hits.push({ doctype: g.doctype, name, label, route: meta.route(name) });
      });
    });
    return hits.slice(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...groups.map((g) => g.data)]);

  React.useEffect(() => setActiveIndex(0), [debounced]);

  const go = React.useCallback(
    (hit: SearchHit) => {
      navigate(hit.route);
      onClose();
      setQuery("");
    },
    [navigate, onClose],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg" className="p-0">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search orders, shipments, LCs, items, customers…"
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {isLoading && <Spinner className="text-muted-foreground" />}
      </div>

      <div className="max-h-80 overflow-y-auto p-1 scrollbar-thin">
        {!enabled ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search across ERPNext.
          </p>
        ) : results.length === 0 && !isLoading ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No results for “{debounced}”.
          </p>
        ) : (
          results.map((hit, i) => (
            <button
              key={`${hit.doctype}-${hit.name}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => go(hit)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                i === activeIndex ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span className="min-w-0 truncate font-medium">{hit.label}</span>
              <Badge variant="secondary" className="shrink-0">
                {hit.doctype}
              </Badge>
            </button>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" /> to open
        </span>
        <span>↑ ↓ to navigate · Esc to close</span>
      </div>
    </Dialog>
  );
}
