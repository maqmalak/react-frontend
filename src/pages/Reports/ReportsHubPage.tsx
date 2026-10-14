import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import {
  ArrowDown, ArrowUp, ArrowUpDown, BarChart3, BookOpen, ClipboardList, ExternalLink, FileSpreadsheet, HandCoins, Loader2, Play,
  Printer, RefreshCw, Search, ShoppingCart, Sparkles, Table2, Truck, Users2, Warehouse,
} from "lucide-react";
import { FrappeForm } from "@/components/forms/frappe-form";
import { ReportChart } from "@/components/charts/report-chart";
import { StatusBadge } from "@/components/common/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useQueryReport } from "@/hooks/useAccounting";
import { formatMoney, formatNumber } from "@/utils/currency";
import { cn } from "@/utils/cn";
import { todayISO } from "@/utils/dates";
import { ALL_REPORTS, REPORT_GROUPS, fiscalYearStart, type ReportCard, type ReportFilters } from "./report-catalog";

/**
 * Report centre: the catalogue on the left (search, grouped by area, only reports this site has and the user may run —
 * mm_core.api.get_available_reports), the chosen report on the right — filters with date presets, summary cards, a
 * Table / Chart switch (bar, line, area, pie, donut, trend line, series colours), a sortable, searchable table with a
 * totals row, and CSV export. Reports with their own page (General Ledger, Trial Balance …) open that page.
 */

const NUMERIC = new Set(["Currency", "Float", "Int", "Percent"]);
const GROUP: Record<string, { icon: typeof BookOpen; tone: string }> = {
  "Financial Statements": { icon: BookOpen, tone: "from-indigo-500 to-violet-600" },
  "Receivables & Payables": { icon: HandCoins, tone: "from-emerald-500 to-teal-600" },
  Selling: { icon: ShoppingCart, tone: "from-sky-500 to-blue-600" },
  Buying: { icon: Truck, tone: "from-amber-500 to-orange-600" },
  Stock: { icon: Warehouse, tone: "from-cyan-500 to-sky-600" },
  "HR & Payroll": { icon: Users2, tone: "from-rose-500 to-pink-600" },
};
const IND: Record<string, string> = { Green: "text-emerald-600", Red: "text-rose-600", Orange: "text-amber-600", Blue: "text-blue-600" };
const ACCENT = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6"];

interface Col { label: string; fieldname: string; fieldtype: string }

/** Frappe columns come as objects or as "Label:Fieldtype/Options:Width" strings (older reports). */
function normalizeColumns(raw: unknown[]): Col[] {
  return raw.map((c, i) => {
    if (typeof c === "string") {
      const [label, type = "Data"] = c.split(":");
      return { label, fieldname: label.toLowerCase().replace(/[^a-z0-9]+/g, "_") || `col${i}`, fieldtype: type.split("/")[0] || "Data" };
    }
    const o = c as { label?: string; fieldname?: string; fieldtype?: string; hidden?: number };
    return { label: o.label ?? o.fieldname ?? `Column ${i + 1}`, fieldname: o.fieldname ?? `col${i}`, fieldtype: o.fieldtype ?? "Data", hidden: o.hidden } as Col & { hidden?: number };
  }).filter((c) => !(c as Col & { hidden?: number }).hidden && c.fieldname !== "__key");
}

function cell(v: unknown, type: string): string {
  if (v === null || v === undefined || v === "") return "";
  if (type === "Currency") return formatMoney(Number(v));
  if (type === "Percent") return `${Number(v).toFixed(1)}%`;
  if (type === "Int") return formatNumber(Number(v), 0);
  if (type === "Float") return formatNumber(Number(v), 2);
  return String(v).replace(/<[^>]+>/g, "");
}
const isStatus = (c: Col) => /status|state/i.test(c.fieldname) && c.fieldtype !== "Currency";

function presets(): [string, string, string][] {
  const t = todayISO(), [y, m] = t.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${y}-${pad(m)}-01`;
  const lm = m === 1 ? [y - 1, 12] : [y, m - 1];
  const lastMonthEnd = new Date(y, m - 1, 0);
  const qStart = `${y}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}-01`;
  return [
    ["This month", monthStart, t],
    ["Last month", `${lm[0]}-${pad(lm[1])}-01`, `${lastMonthEnd.getFullYear()}-${pad(lastMonthEnd.getMonth() + 1)}-${pad(lastMonthEnd.getDate())}`],
    ["This quarter", qStart, t],
    ["Fiscal year", fiscalYearStart(), t],
  ];
}

function downloadCsv(filename: string, cols: Col[], rows: Record<string, unknown>[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/<[^>]+>/g, "").replace(/"/g, '""')}"`;
  const csv = [cols.map((c) => esc(c.label)).join(","), ...rows.map((r) => cols.map((c) => esc(r[c.fieldname])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ReportsHubPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const [find, setFind] = useState("");
  const names = useMemo(() => ALL_REPORTS.map((r) => r.report), []);
  const { data: availData, isLoading: availLoading, error: availError } = useFrappeGetCall<{ message: string[] }>(
    "mm_core.api.get_available_reports", { names: JSON.stringify(names) }, "mm_core.reports.available", { revalidateOnFocus: false });
  const available = useMemo(() => {
    if (availError) return new Set(names);
    const raw = (availData as unknown as { message?: string[] })?.message ?? (Array.isArray(availData) ? (availData as string[]) : []);
    return new Set(raw);
  }, [availData, availError, names]);

  const groups = useMemo(() => {
    const q = find.trim().toLowerCase();
    return REPORT_GROUPS.map((g) => ({ ...g, reports: g.reports.filter((r) => available.has(r.report) && (!q || `${r.title} ${r.description} ${g.title}`.toLowerCase().includes(q))) }))
      .filter((g) => g.reports.length > 0);
  }, [available, find]);
  const runnable = useMemo(() => groups.flatMap((g) => g.reports).filter((r) => !r.to), [groups]);
  // default: the first report that runs as-is (its required filters all have defaults)
  const ready = (c: ReportCard) => (c.filters ?? []).every((f) => !f.reqd || f.fieldname === "company" || c.defaults?.({ company })?.[f.fieldname] !== undefined);
  const key = params.get("r") ?? (runnable.find(ready) ?? runnable[0])?.key ?? "";
  const card = ALL_REPORTS.find((r) => r.key === key);
  const groupOf = REPORT_GROUPS.find((g) => g.reports.some((r) => r.key === key))?.title ?? "Report";
  const total = groups.reduce((a, g) => a + g.reports.length, 0);

  const pick = (r: ReportCard) => (r.to ? navigate(r.to) : setParams({ r: r.key }, { replace: true }));

  return (
    <div className="grid min-h-full gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      {/* catalogue */}
      <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25"><Sparkles className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Report centre</h1>
            <p className="text-xs text-muted-foreground">{total} reports · preview, chart & export</p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a report…" aria-label="Find a report"
            className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        {availLoading && <Skeleton className="h-64 rounded-2xl" />}
        {groups.map((g) => {
          const G = GROUP[g.title] ?? { icon: ClipboardList, tone: "from-slate-500 to-slate-700" };
          return (
            <div key={g.title}>
              <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span className={cn("grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br text-white", G.tone)}><G.icon className="h-3 w-3" /></span>{g.title}
                <span className="rounded-full bg-muted px-1.5 text-[10px]">{g.reports.length}</span>
              </p>
              <div className="space-y-1">
                {g.reports.map((r) => {
                  const on = r.key === key;
                  return (
                    <button key={r.key} type="button" onClick={() => pick(r)} aria-current={on}
                      className={cn("flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition",
                        on ? "border-primary/50 bg-primary/10 shadow-sm ring-1 ring-primary/20" : "border-transparent hover:border-border hover:bg-card")}>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm font-semibold", on && "text-primary")}>{r.title}</span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">{r.description}</span>
                      </span>
                      {r.to && <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Opens its own page" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!availLoading && !groups.length && <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">{find ? "No report matches your search." : "No reports available for your role."}</p>}
      </aside>

      {/* report */}
      <section className="min-w-0">
        {card && !card.to ? <ReportPane key={card.key} card={card} group={groupOf} company={company} />
          : <div className="grid h-64 place-items-center rounded-2xl border bg-card text-sm text-muted-foreground">Choose a report on the left.</div>}
      </section>
    </div>
  );
}

function ReportPane({ card, group, company }: { card: ReportCard; group: string; company?: string }) {
  const G = GROUP[group] ?? { icon: ClipboardList, tone: "from-slate-500 to-slate-700" };
  const initial = useMemo(() => (card.defaults?.({ company }) ?? { company }) as ReportFilters, [card, company]);
  const [draft, setDraft] = useState<ReportFilters>(initial);
  const [applied, setApplied] = useState<ReportFilters>(initial);
  useEffect(() => { setDraft(initial); setApplied(initial); }, [initial]);
  const [view, setView] = useState<"table" | "chart">("table");
  const [rowFind, setRowFind] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const cleaned = useMemo(() => Object.fromEntries(Object.entries(applied).filter(([, v]) => v !== undefined && v !== null && v !== "")), [applied]);
  const missing = (card.filters ?? []).filter((f) => f.reqd && (draft[f.fieldname] === undefined || draft[f.fieldname] === ""));
  // run only once every required filter has a value (e.g. Bank Reconciliation waits for its bank account)
  const ready = (card.filters ?? []).every((f) => !f.reqd || (cleaned[f.fieldname] !== undefined && cleaned[f.fieldname] !== ""));
  const { data, isLoading, isPreparing, error, mutate } = useQueryReport(card.report, cleaned, !!cleaned.company && ready);
  useEffect(() => { if (data) setRanAt(new Date()); }, [data]);
  const hasDates = (card.filters ?? []).some((f) => f.fieldname === "from_date") && (card.filters ?? []).some((f) => f.fieldname === "to_date");

  const cols = useMemo(() => normalizeColumns((data?.columns ?? []) as unknown[]), [data]);
  const allRows = useMemo(() => (data?.result ?? []).map((r) => (Array.isArray(r) ? Object.fromEntries(cols.map((c, i) => [c.fieldname, (r as unknown[])[i]])) : r)) as Record<string, unknown>[], [data, cols]);
  const rows = useMemo(() => {
    let r = allRows;
    const q = rowFind.trim().toLowerCase();
    if (q) r = r.filter((x) => cols.some((c) => String(x[c.fieldname] ?? "").toLowerCase().includes(q)));
    if (sort) {
      const c = cols.find((x) => x.fieldname === sort.key);
      const numeric = c && NUMERIC.has(c.fieldtype);
      r = [...r].sort((a, b) => (numeric ? Number(a[sort.key] ?? 0) - Number(b[sort.key] ?? 0) : String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), undefined, { numeric: true })) * sort.dir);
    }
    return r;
  }, [allRows, rowFind, sort, cols]);
  const totals = useMemo(() => Object.fromEntries(cols.filter((c) => NUMERIC.has(c.fieldtype) && c.fieldtype !== "Percent")
    .map((c) => [c.fieldname, rows.reduce((a, r) => a + (Number(r[c.fieldname]) || 0), 0)])), [cols, rows]);
  const summary = data?.report_summary?.length ? data.report_summary
    : cols.filter((c) => c.fieldtype === "Currency" && totals[c.fieldname]).sort((a, b) => Math.abs(totals[b.fieldname]) - Math.abs(totals[a.fieldname]))
      .slice(0, 4).map((c) => ({ label: `Total ${c.label}`, value: totals[c.fieldname], datatype: "Currency" as string, indicator: undefined as string | undefined }));
  const chart = useMemo((): { rows: Record<string, string | number>[]; series: string[]; type: string; fromTable: boolean } | null => {
    const rc = data?.chart?.data;
    if (rc?.labels?.length) {
      // some reports send one dataset per document (Accounts Receivable: ~1,600) — keep the 8 largest, fold the rest into "Other"
      const all = (rc.datasets ?? []).map((d, k) => ({ name: d.name ?? `Series ${k + 1}`, values: rc.labels!.map((_, i) => Number(d.values?.[i] ?? 0)) }));
      const ranked = [...all].sort((a, b) => b.values.reduce((x, v) => x + Math.abs(v), 0) - a.values.reduce((x, v) => x + Math.abs(v), 0));
      // more than 12 datasets (unnamed, one per document) read best as one total per label; otherwise top 8 + "Other"
      const keep = all.length > 12 ? [{ name: "Total", values: rc.labels.map((_, i) => all.reduce((x, d) => x + d.values[i], 0)) }] : ranked.slice(0, 8);
      const rest = all.length > 12 ? [] : ranked.slice(8);
      if (rest.length) keep.push({ name: `Other (${rest.length})`, values: rc.labels.map((_, i) => rest.reduce((x, d) => x + d.values[i], 0)) });
      const series = keep.map((d) => d.name);
      return { rows: rc.labels.map((l, i) => Object.fromEntries([["label", l], ...keep.map((d) => [d.name, d.values[i]])])),
        series, type: data?.chart?.type ?? "bar", fromTable: false };
    }
    const labelCol = cols.find((c) => !NUMERIC.has(c.fieldtype));
    const numCols = cols.filter((c) => NUMERIC.has(c.fieldtype) && c.fieldtype !== "Percent").slice(0, 4);
    if (!labelCol || !numCols.length || !rows.length) return null;
    return { rows: rows.slice(0, 40).map((r) => Object.fromEntries([["label", cell(r[labelCol.fieldname], "Data")], ...numCols.map((c) => [c.label, Number(r[c.fieldname] ?? 0)])])),
      series: numCols.map((c) => c.label), type: "bar", fromTable: true };
  }, [data, cols, rows]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", G.tone)}><card.icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group}</p>
              <h2 className="truncate text-xl font-bold tracking-tight">{card.title}</h2>
              <p className="text-xs text-muted-foreground">
                {card.description}{data ? ` · ${formatNumber(allRows.length, 0)} rows` : ""}
                {ranAt ? ` · run ${ranAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void mutate()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-sm hover:bg-muted" title="Run again">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </button>
            <button type="button" disabled={!rows.length} onClick={() => downloadCsv(`${card.key}-${String(cleaned.to_date ?? cleaned.report_date ?? todayISO())}.csv`, cols, rows)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-300">
              <FileSpreadsheet className="h-4 w-4" /> Excel (CSV)
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-500/20 dark:text-rose-300">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {card.filters && card.filters.length > 0 && (
          <div className="relative space-y-3 border-t bg-muted/20 px-4 py-3 sm:px-5">
            {hasDates && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-muted-foreground">Period</span>
                {presets().map(([label, f, to]) => {
                  const on = draft.from_date === f && draft.to_date === to;
                  return (
                    <button key={label} type="button" onClick={() => { const next = { ...draft, from_date: f, to_date: to }; setDraft(next); setApplied(next); }}
                      className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium transition", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{label}</button>
                  );
                })}
              </div>
            )}
            <FrappeForm fields={card.filters} values={draft} onChange={(f, v) => setDraft((d) => ({ ...d, [f]: v }))} />
            <div className="flex flex-wrap items-center justify-end gap-3">
              {missing.length > 0 && <span className="text-xs text-destructive">Fill in: {missing.map((f) => f.label).join(", ")}</span>}
              <button type="button" onClick={() => setDraft(initial)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Reset</button>
              <button type="button" onClick={() => setApplied({ ...draft })} disabled={missing.length > 0 || isLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
                <Play className="h-4 w-4" /> Run report
              </button>
            </div>
          </div>
        )}
      </div>

      {isPreparing && <p className="rounded-xl border bg-sky-500/5 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">This report is being prepared in the background — results appear here when ready.</p>}

      {summary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.slice(0, 8).map((s, i) => (
            <div key={s.label} className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: ACCENT[i % ACCENT.length] }} />
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 truncate text-2xl font-bold tabular-nums tracking-tight", s.indicator ? IND[s.indicator] : undefined)}>
                {s.datatype === "Currency" ? formatMoney(Number(s.value), undefined, { compact: true }) : s.datatype === "Percent" ? `${Number(s.value).toFixed(1)}%` : typeof s.value === "number" ? formatNumber(s.value, 0) : String(s.value)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            {([["table", Table2, "Table"], ["chart", BarChart3, "Chart"]] as const).map(([k, Icon, label]) => (
              <button key={k} type="button" disabled={k === "chart" && !chart} onClick={() => setView(k)}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition disabled:opacity-40",
                  view === k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
          {view === "table" && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={rowFind} onChange={(e) => setRowFind(e.target.value)} placeholder="Search in results…" aria-label="Search in results"
                className="h-8 w-56 rounded-lg border bg-background pl-8 pr-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          )}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {error ? <div className="p-6 text-sm text-rose-600">{error instanceof Error ? error.message : "The report could not be run."}</div>
          : !cleaned.company ? <div className="p-6 text-sm text-muted-foreground">Choose a company to run this report.</div>
          : !ready ? <div className="p-6 text-sm text-muted-foreground">Fill in the required filters above and press <b>Run report</b>.</div>
          : !data ? <Skeleton className="m-4 h-64 rounded-xl" />
          : view === "chart" && chart ? <ReportChart key={card.key} report={card.key} chart={chart} />
          : !rows.length ? <p className="p-10 text-center text-sm text-muted-foreground">{rowFind ? "No rows match your search." : "No rows for these filters."}</p>
          : (
            <div className="max-h-[65vh] overflow-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                  <tr>
                    {cols.map((c) => {
                      const on = sort?.key === c.fieldname;
                      return (
                        <th key={c.fieldname} className={cn("whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", NUMERIC.has(c.fieldtype) ? "text-right" : "text-left")}>
                          <button type="button" onClick={() => setSort(on ? (sort!.dir === 1 ? { key: c.fieldname, dir: -1 } : null) : { key: c.fieldname, dir: 1 })}
                            className={cn("inline-flex items-center gap-1 hover:text-foreground", on && "text-foreground")}>
                            {c.label}{on ? (sort!.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 1000).map((r, i) => (
                    <tr key={i} className={cn("border-t border-border/60 transition-colors hover:bg-primary/[0.05]", i % 2 === 1 && "bg-muted/20")}>
                      {cols.map((c, ci) => (
                        <td key={c.fieldname} className={cn("whitespace-nowrap px-3 py-2", NUMERIC.has(c.fieldtype) && "text-right tabular-nums", ci === 0 && "font-medium")}>
                          {isStatus(c) && r[c.fieldname] ? <StatusBadge status={String(r[c.fieldname])} /> : cell(r[c.fieldname], c.fieldtype)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {Object.keys(totals).length > 0 && (
                  <tfoot className="sticky bottom-0 bg-muted/95 font-semibold backdrop-blur">
                    <tr className="border-t-2 border-border">
                      {cols.map((c, ci) => (
                        <td key={c.fieldname} className={cn("whitespace-nowrap px-3 py-2.5", NUMERIC.has(c.fieldtype) && "text-right tabular-nums")}>
                          {ci === 0 ? `Total · ${formatNumber(rows.length, 0)} rows` : c.fieldname in totals ? cell(totals[c.fieldname], c.fieldtype) : ""}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
              {rows.length > 1000 && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Showing the first 1,000 of {formatNumber(rows.length, 0)} rows — export for all of them.</p>}
            </div>
          )}
      </div>
    </div>
  );
}
