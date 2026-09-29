import useSWR from "swr";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { BarChart, LineChart } from "@/components/charts/charts";
import { docUrl } from "@/app/doc-routes";
import { postCall } from "@/services/frappe";
import { cn } from "@/utils/cn";
import { formatMoney, formatNumber } from "@/utils/currency";

type Fmt = "money" | "number" | "days" | "percent" | "text";
export interface InsightsData {
  tiles: { label: string; value: number | string | null; fmt: Fmt; sub?: string | null; tone: string }[];
  bars?: { label: string; pct: number; sub?: string | null; tone: string }[];
  lists?: { title: string; rows: { label: string; value: number; fmt: Fmt; sub?: string | null; link?: { doctype: string; name: string } | null }[] }[];
  chart?: { title: string; xKey: string; money?: boolean; type?: "bar" | "line"; series: { key: string; label: string; color?: string }[]; data: Record<string, any>[] };
}

const TONE: Record<string, string> = {
  primary: "from-primary/15", emerald: "from-emerald-500/15", amber: "from-amber-500/15", rose: "from-rose-500/15", sky: "from-sky-500/15", violet: "from-violet-500/15",
};
const BAR: Record<string, string> = { primary: "bg-primary", emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", sky: "bg-sky-500", violet: "bg-violet-500" };

export const fmtInsight = (v: number | string | null | undefined, f: Fmt, currency = "PKR") => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" || f === "text") return String(v);
  if (f === "money") return formatMoney(v, currency, { decimals: 2 });
  if (f === "days") return `${formatNumber(v, 0)} d`;
  if (f === "percent") return `${formatNumber(v, 1)}%`;
  return formatNumber(v, Math.abs(v) < 100 && v % 1 ? 2 : 0);
};

/**
 * Generic "at a glance" block: gradient KPI tiles, progress bars and short ranked lists, loaded from a whitelisted
 * method (`args` are passed through). Used by the selling documents; any form can reuse it.
 */
export function InsightsPanel({ method, args, cacheKey, currency = "PKR", loadingNote, omitTiles, hideBars, hideChart }: {
  method: string; args: Record<string, unknown>; cacheKey: string | null; currency?: string; loadingNote?: string;
  /** Tile labels to drop (or `true` for all) — when the host page already shows those figures. */
  omitTiles?: string[] | true; hideBars?: boolean; hideChart?: boolean;
}) {
  const { data, isLoading } = useSWR(cacheKey, () => postCall<InsightsData>(method, args), { revalidateOnFocus: false });
  if (!cacheKey) return null;
  if (isLoading && !data)
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
        {loadingNote && <p className="text-xs text-muted-foreground">{loadingNote}</p>}
      </div>
    );
  if (!data) return null;
  const lists = (data.lists ?? []).filter((l) => l.rows.length);
  const tiles = omitTiles === true ? [] : data.tiles.filter((t) => !(omitTiles ?? []).includes(t.label));
  const bars = hideBars ? [] : data.bars ?? [];
  const chart = hideChart ? undefined : data.chart;
  return (
    <div className="space-y-4">
      {tiles.length > 0 && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className={cn("relative overflow-hidden bg-gradient-to-br to-transparent p-4", TONE[t.tone] ?? TONE.primary)}>
            <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
            <p className="mt-1 truncate text-xl font-bold tabular-nums">{fmtInsight(t.value, t.fmt, currency)}</p>
            {t.sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={t.sub}>{t.sub}</p>}
            <span className={cn("absolute inset-x-0 bottom-0 h-0.5", BAR[t.tone] ?? BAR.primary)} />
          </Card>
        ))}
      </div>}
      {chart && chart.data.some((r) => chart.series.some((s) => Number(r[s.key]))) && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">{chart.title}</p>
          {chart.type === "line" ? (
            <LineChart data={chart.data} xKey={chart.xKey} series={chart.series} height={240} money={chart.money} currency={currency} legend />
          ) : (
            <BarChart data={chart.data} xKey={chart.xKey} series={chart.series} height={240} money={chart.money} currency={currency} legend={chart.series.length > 1} />
          )}
        </Card>
      )}
      {(bars.length > 0 || lists.length > 0) && (
        // With a progress card: 1/3 for it, lists share the rest. Without: lists in two wide columns (an odd last one spans both).
        <div className={cn("grid gap-4", bars.length ? "lg:grid-cols-3" : lists.length > 1 ? "lg:grid-cols-2" : "")}>
          {bars.length > 0 && (
            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold">Progress</p>
              {bars.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{b.label}</span><span className="tabular-nums text-muted-foreground">{formatNumber(b.pct, 1)}%{b.sub ? ` · ${b.sub}` : ""}</span></div>
                  <div className="h-2.5 rounded-full bg-muted"><div className={cn("h-2.5 rounded-full transition-[width] duration-500", BAR[b.tone] ?? BAR.primary)} style={{ width: `${b.pct}%` }} /></div>
                </div>
              ))}
            </Card>
          )}
          {lists.map((l, li) => {
            const max = Math.max(1, ...l.rows.map((r) => Math.abs(r.value)));
            return (
              <Card key={l.title} className={cn("p-5", bars.length ? "lg:col-span-2" : lists.length > 1 && lists.length % 2 === 1 && li === lists.length - 1 ? "lg:col-span-2" : "")}>
                <p className="mb-3 text-sm font-semibold">{l.title}</p>
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                  {l.rows.map((r, i) => {
                    const u = r.link ? docUrl(r.link.doctype, r.link.name) : null;
                    return (
                      <li key={`${r.label}-${i}`}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                          {u ? <Link to={u.href} className="truncate font-medium text-primary hover:underline">{r.label}</Link> : <span className="truncate font-medium" title={r.label}>{r.label}</span>}
                          <span className="shrink-0 tabular-nums">{r.fmt !== "text" && <b>{fmtInsight(r.value, r.fmt, currency)}</b>}{r.sub ? <span className="ml-1.5 text-muted-foreground">{r.sub}</span> : null}</span>
                        </div>
                        {r.fmt !== "text" && <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary/80" style={{ width: `${r.fmt === "percent" ? Math.min(100, r.value) : (Math.abs(r.value) / max) * 100}%` }} /></div>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
