import { useState } from "react";
import { Link } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/utils/cn";
import { docUrl } from "@/app/doc-routes";

interface ConnRow { name: string; status?: string; date?: string | null; detail?: string | null }
interface ConnGroup { group: string; doctype: string; label: string; count: number; rows: ConnRow[] }

/** @deprecated kept for older imports — use docUrl() from "@/app/doc-routes". */
export { DOC_ROUTES as DOC_FORM_ROUTES } from "@/app/doc-routes";

const SHOW = 6;

/** The desk's "Connections" dashboard: linked documents grouped by area, with counts and the latest rows. */
export function ConnectionsPanel({ doctype, name }: { doctype: string; name: string }) {
  const { data, isLoading, error } = useFrappeGetCall<{ message: ConnGroup[] }>(
    "mm_core.connections.get_connections",
    { doctype, name },
    `micromax.connections.${doctype}.${name}`,
    { revalidateOnFocus: false },
  );
  const groups = data?.message ?? [];
  const byGroup = groups.reduce<Record<string, ConnGroup[]>>((acc, g) => ((acc[g.group] ??= []).push(g), acc), {});

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}</div>;
  if (error) return <p className="text-sm text-destructive">Could not load connections.</p>;
  if (!groups.length) return <Card className="p-8 text-center text-sm text-muted-foreground">No linked document types are defined for {doctype}.</Card>;

  return (
    <div className="space-y-6">
      {Object.entries(byGroup).map(([group, list]) => (
        <section key={group} className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-4 w-1 rounded-full bg-primary" /> {group}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((g) => <ConnCard key={g.doctype} g={g} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function ConnCard({ g }: { g: ConnGroup }) {
  const [all, setAll] = useState(false);
  const rows = all ? g.rows : g.rows.slice(0, SHOW);
  return (
    <Card className={cn("flex flex-col overflow-hidden p-0", !g.count && "opacity-70")}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4 text-primary" /> {g.label}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", g.count ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
          {g.count > 50 ? `${g.count} · latest 50` : g.count}
        </span>
      </div>
      {g.count === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">None linked</p>
      ) : (
        <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto scrollbar-thin">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-3 px-4 py-2 text-xs hover:bg-muted/50">
              <div className="min-w-0 flex-1">
                {(() => {
                  const u = docUrl(g.doctype, r.name);
                  return u.external ? (
                    <a href={u.href} target="_blank" rel="noreferrer" className="block truncate font-medium text-primary hover:underline" title="Opens in ERPNext desk">{r.name} ↗</a>
                  ) : (
                    <Link to={u.href} className="block truncate font-medium text-primary hover:underline">{r.name}</Link>
                  );
                })()}
                <span className="block truncate text-muted-foreground">{[r.date, r.detail].filter(Boolean).join(" · ")}</span>
              </div>
              {r.status && <StatusBadge status={r.status} className="shrink-0" />}
            </li>
          ))}
        </ul>
      )}
      {g.rows.length > SHOW && (
        <button type="button" onClick={() => setAll((a) => !a)} className="flex items-center justify-center gap-1 border-t border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
          {all ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show {g.rows.length - SHOW} more</>}
        </button>
      )}
    </Card>
  );
}
