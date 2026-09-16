import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

/**
 * Global search (Ctrl/Cmd + K).
 *
 * Uses Frappe's global search RPC across the DocTypes relevant to Micromax.
 * Results are permission-filtered by ERPNext on the server.
 */

interface SearchHit {
  doctype: string;
  name: string;
  label: string;
  description?: string;
  route: string;
}

/** DocType -> SPA route builder. */
const ROUTE_MAP: Record<string, (name: string) => string> = {
  "LC Proforma": (n) => `/export/lc-proforma/${encodeURIComponent(n)}`,
  "Export Shipment": (n) => `/export/shipments/${encodeURIComponent(n)}`,
  "Import Shipment": (n) => `/import/shipments/${encodeURIComponent(n)}`,
  "Import Cost Sheet": (n) => `/import/cost-sheets/${encodeURIComponent(n)}`,
  "Sales Order": (n) => `/export/orders/${encodeURIComponent(n)}`,
  "Purchase Order": () => `/import/purchase-orders`,
  Item: () => `/masters/items`,
  Customer: () => `/masters/customers`,
  Supplier: () => `/masters/suppliers`,
  "Work Order": () => `/production/work-orders`,
  "Sales Invoice": () => `/reports/export`,
};

const SEARCH_DOCTYPES = Object.keys(ROUTE_MAP);

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

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const debounced = useDebounced(query.trim(), 250);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const enabled = debounced.length >= 2;

  // Cross-doctype global search (permission filtered server-side).
  const { data, isLoading } = useFrappeGetCall<any>(
    "frappe.utils.global_search.search",
    { text: debounced, start: 0, limit: 20 },
    enabled ? `micromax.search.global.${debounced}` : null,
  );

  const results: SearchHit[] = React.useMemo(() => {
    const rows = (data as any)?.message ?? data ?? [];
    if (!Array.isArray(rows)) return [];
    const hits: SearchHit[] = [];
    rows.forEach((r: any) => {
      const doctype = r.doctype ?? r.doc_type;
      const name = r.name ?? r.docname;
      if (!doctype || !name || !SEARCH_DOCTYPES.includes(doctype)) return;
      if (hits.some((h) => h.doctype === doctype && h.name === name)) return;
      hits.push({
        doctype,
        name,
        label: name,
        description: String(r.content ?? "").replace(/\s+/g, " ").slice(0, 90),
        route: (ROUTE_MAP[doctype] ?? (() => "/"))(name),
      });
    });
    return hits.slice(0, 20);
  }, [data]);

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
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search orders, shipments, LCs, items, customers…"
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
              <span className="min-w-0">
                <span className="block truncate font-medium">{hit.label}</span>
                {hit.description && (
                  <span className="block truncate text-xs text-muted-foreground">{hit.description}</span>
                )}
              </span>
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