import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  CreditCard,
  PieChart,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FrappeLinkField } from "@/components/forms/field-primitives";
import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/pages/Dashboard/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/charts/chart-card";
import { BarChart, LineChart } from "@/components/charts/charts";
import { useQueryReport, useFiscalYears, useChartOfAccounts } from "@/hooks/useAccounting";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { formatNumber } from "@/utils/currency";
import { asNumber, cn } from "@/utils/cn";
import { exportToCsv } from "@/utils/export";
import { humanizeError } from "@/services/frappe";

const HEADS = ["Asset", "Liability", "Equity", "Income", "Expense"] as const;
type Head = (typeof HEADS)[number];
/** Debit-natured heads read as (debit - credit); credit-natured heads read as (credit - debit). */
const DEBIT_NATURED = new Set<Head>(["Asset", "Expense"]);

const HEAD_META: Record<Head, { icon: typeof Wallet; tone: "info" | "warning" | "violet" | "success" | "destructive"; hex: string }> = {
  Asset: { icon: Wallet, tone: "info", hex: "#3b82f6" },
  Liability: { icon: CreditCard, tone: "warning", hex: "#f59e0b" },
  Equity: { icon: PieChart, tone: "violet", hex: "#8b5cf6" },
  Income: { icon: TrendingUp, tone: "success", hex: "#10b981" },
  Expense: { icon: TrendingDown, tone: "destructive", hex: "#f43f5e" },
};

const HEAD_SERIES = HEADS.map((h) => ({ key: h, label: h, color: HEAD_META[h].hex }));

interface TrialBalanceRow {
  account: string;
  parent_account?: string | null;
  indent: number;
  currency?: string;
  is_group_account: 0 | 1;
  acc_name: string;
  acc_number?: string | null;
  opening_debit: number;
  opening_credit: number;
  debit: number;
  credit: number;
  closing_debit: number;
  closing_credit: number;
}

const money = (n: number) => (n ? formatNumber(n, 2) : "—");

/**
 * Net closing balance per account: (opening debit - opening credit) +
 * (activity debit - activity credit). A positive net is a debit balance, a
 * negative net is a credit balance — so each account shows on one side only,
 * the conventional single-sided trial-balance closing presentation (rather
 * than the report's raw gross closing_debit/closing_credit, which can both
 * be nonzero at once).
 */
function netClosing(r: TrialBalanceRow): { debit: number; credit: number } {
  const net = r.opening_debit - r.opening_credit + (r.debit - r.credit);
  return net > 0 ? { debit: net, credit: 0 } : { debit: 0, credit: -net };
}

/** Same single-sided convention as netClosing, applied to the opening balance alone. */
function netOpening(r: TrialBalanceRow): { debit: number; credit: number } {
  const net = r.opening_debit - r.opening_credit;
  return net > 0 ? { debit: net, credit: 0 } : { debit: 0, credit: -net };
}

/** One distinct color per root account type — used to tag every row in the tree. */
const ROOT_TYPE_COLORS: Record<string, { dot: string; text: string; label: string }> = {
  Asset: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", label: "Asset" },
  Liability: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Liability" },
  Equity: { dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", label: "Equity" },
  Income: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Income" },
  Expense: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", label: "Expense" },
};

/** Rows in a collapsed group's subtree — hidden until that group is re-expanded. */
function visibleRows(rows: TrialBalanceRow[], collapsed: Set<string>): TrialBalanceRow[] {
  const out: TrialBalanceRow[] = [];
  let hideUntilIndent: number | null = null;
  for (const r of rows) {
    if (hideUntilIndent !== null) {
      if (r.indent > hideUntilIndent) continue;
      hideUntilIndent = null;
    }
    out.push(r);
    if (r.is_group_account && collapsed.has(r.account)) hideUntilIndent = r.indent;
  }
  return out;
}

/**
 * Trial Balance — opening/activity/closing per account, grouped by the real
 * Chart of Accounts hierarchy (`show_group_accounts`) so parent accounts show
 * live accumulated subtotals computed by ERPNext itself, not re-derived here.
 */
export function ReportTrialBalancePage() {
  const { company } = useCompanyContext();
  const { data: fiscalYears } = useFiscalYears();
  const [fiscalYear, setFiscalYear] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [chartMode, setChartMode] = useState<"Bars" | "Trend">("Bars");
  const [hiddenHeads, setHiddenHeads] = useState<Set<Head>>(new Set());
  const toggleHead = (h: Head) =>
    setHiddenHeads((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });

  useEffect(() => {
    if (fiscalYears && fiscalYears.length > 0 && !fiscalYear) setFiscalYear(fiscalYears[0].name);
  }, [fiscalYears, fiscalYear]);

  const fyMeta = fiscalYears?.find((fy) => fy.name === fiscalYear);

  // Reset the date range to the fiscal year's own bounds whenever the fiscal
  // year changes (including its first load) — narrowing from there is what
  // drives ERPNext's own "opening as of From Date" recalculation below.
  useEffect(() => {
    if (fyMeta?.year_start_date && fyMeta?.year_end_date) {
      setFromDate(fyMeta.year_start_date);
      setToDate(fyMeta.year_end_date);
    }
  }, [fyMeta?.year_start_date, fyMeta?.year_end_date]);

  const filters = useMemo(
    () => ({
      company,
      fiscal_year: fiscalYear,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      cost_center: costCenter || undefined,
      show_group_accounts: 1,
    }),
    [company, fiscalYear, fromDate, toDate, costCenter],
  );

  const { data, error, isLoading, mutate } = useQueryReport("Trial Balance", filters, Boolean(company && fiscalYear));

  // Trial Balance rows don't carry root_type themselves — look it up from the
  // real Chart of Accounts (same doctype field ERPNext itself groups by).
  const { data: coa } = useChartOfAccounts(company);
  const rootTypeMap = useMemo(() => new Map((coa ?? []).map((a) => [a.name, a.root_type])), [coa]);

  const allRows = ((data?.result ?? []) as unknown as TrialBalanceRow[]).filter(
    (r) => r && typeof r.account === "string",
  );
  const totalRow = allRows.find((r) => r.account === "'Total'");
  const bodyRows = allRows.filter((r) => r.account !== "'Total'");
  const shown = visibleRows(bodyRows, collapsed);

  // One net figure per head, read straight off the report's own root-level
  // group rows (indent 0) — no accounting math re-derived here.
  const headTotals = useMemo(() => {
    const totals: Record<Head, number> = { Asset: 0, Liability: 0, Equity: 0, Income: 0, Expense: 0 };
    bodyRows
      .filter((r) => r.indent === 0)
      .forEach((r) => {
        const rt = rootTypeMap.get(r.account) as Head | undefined;
        if (!rt || !(rt in totals)) return;
        totals[rt] += DEBIT_NATURED.has(rt) ? r.closing_debit - r.closing_credit : r.closing_credit - r.closing_debit;
      });
    return totals;
  }, [bodyRows, rootTypeMap]);

  // Trial Balance itself has no periodicity filter (it's a single from/to
  // snapshot), so the monthly trend is built from real General Ledger
  // postings across the fiscal year — bucketed by month and by each entry's
  // real account root_type, then accumulated into a running balance per head
  // (the same "closing as of this month" reading the table above shows for
  // the year as a whole).
  const chartFilters = useMemo(
    () => ({ company, from_date: fyMeta?.year_start_date, to_date: fyMeta?.year_end_date, show_opening_entries: 0 }),
    [company, fyMeta],
  );
  const { data: glReport, isLoading: chartLoading } = useQueryReport(
    "General Ledger",
    chartFilters,
    Boolean(company && fyMeta?.year_start_date && fyMeta?.year_end_date),
  );

  const monthlyData = useMemo(() => {
    if (!fyMeta?.year_start_date || !fyMeta?.year_end_date) return [];
    const entries = (glReport?.result ?? []).filter(
      (r) => typeof r.account === "string" && !(r.account as string).startsWith("'"),
    );

    const months: { key: string; label: string }[] = [];
    const start0 = new Date(fyMeta.year_start_date);
    const fyEnd = new Date(fyMeta.year_end_date);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start0.getFullYear(), start0.getMonth() + i, 1);
      if (d > fyEnd) break;
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) });
    }

    const byMonth = new Map<string, Record<Head, { debit: number; credit: number }>>(
      months.map((m) => [
        m.key,
        { Asset: { debit: 0, credit: 0 }, Liability: { debit: 0, credit: 0 }, Equity: { debit: 0, credit: 0 }, Income: { debit: 0, credit: 0 }, Expense: { debit: 0, credit: 0 } },
      ]),
    );

    entries.forEach((e) => {
      const d = new Date(String(e.posting_date));
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = byMonth.get(key);
      const rt = rootTypeMap.get(String(e.account)) as Head | undefined;
      if (bucket && rt) {
        bucket[rt].debit += asNumber(e.debit);
        bucket[rt].credit += asNumber(e.credit);
      }
    });

    const cum: Record<Head, number> = { Asset: 0, Liability: 0, Equity: 0, Income: 0, Expense: 0 };
    return months.map((m) => {
      const b = byMonth.get(m.key)!;
      HEADS.forEach((h) => {
        cum[h] += DEBIT_NATURED.has(h) ? b[h].debit - b[h].credit : b[h].credit - b[h].debit;
      });
      return { month: m.label, Asset: cum.Asset, Liability: cum.Liability, Equity: cum.Equity, Income: cum.Income, Expense: cum.Expense };
    });
  }, [glReport, fyMeta, rootTypeMap]);

  const toggle = (account: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(account)) next.delete(account);
      else next.add(account);
      return next;
    });

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(bodyRows.filter((r) => r.is_group_account).map((r) => r.account)));

  const balanced = totalRow ? Math.abs(totalRow.closing_debit - totalRow.closing_credit) < 0.005 : true;
  const outOfBalanceBy = totalRow ? Math.abs(totalRow.closing_debit - totalRow.closing_credit) : 0;

  const exportRows = () => {
    const cols = [
      { key: "account", label: "Account" },
      { key: "opening_debit", label: "Opening (Dr)" },
      { key: "opening_credit", label: "Opening (Cr)" },
      { key: "debit", label: "Debit" },
      { key: "credit", label: "Credit" },
      { key: "closing_debit", label: "Closing (Dr)" },
      { key: "closing_credit", label: "Closing (Cr)" },
    ];
    const rows = [
      ...bodyRows.map((r) => {
        const opening = netOpening(r);
        const closing = netClosing(r);
        return {
          account: `${"  ".repeat(r.indent)}${r.acc_number ? `${r.acc_number} - ` : ""}${r.acc_name}`,
          opening_debit: opening.debit,
          opening_credit: opening.credit,
          debit: r.debit,
          credit: r.credit,
          closing_debit: closing.debit,
          closing_credit: closing.credit,
        };
      }),
      ...(totalRow
        ? [
            {
              account: "Total",
              opening_debit: totalRow.opening_debit,
              opening_credit: totalRow.opening_credit,
              debit: totalRow.debit,
              credit: totalRow.credit,
              closing_debit: totalRow.closing_debit,
              closing_credit: totalRow.closing_credit,
            },
          ]
        : []),
    ];
    exportToCsv(cols, rows, "trial-balance");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trial Balance"
        subtitle="Opening, activity and closing balance per account, straight from ERPNext's report engine"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={expandAll} disabled={!bodyRows.length}>
              <ChevronsUpDown className="h-4 w-4" />
              Expand all
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} disabled={!bodyRows.length}>
              <ChevronsDownUp className="h-4 w-4" />
              Collapse all
            </Button>
            <Button size="sm" onClick={exportRows} disabled={!bodyRows.length}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="tb-fy">Fiscal Year</Label>
          <Select id="tb-fy" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="w-48">
            {(fiscalYears ?? []).map((fy) => (
              <option key={fy.name} value={fy.name}>
                {fy.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tb-from">From Date</Label>
          <Input
            id="tb-from"
            type="date"
            value={fromDate}
            min={fyMeta?.year_start_date}
            max={toDate || fyMeta?.year_end_date}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <Label htmlFor="tb-to">To Date</Label>
          <Input
            id="tb-to"
            type="date"
            value={toDate}
            min={fromDate || fyMeta?.year_start_date}
            max={fyMeta?.year_end_date}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="w-56">
          <Label>Cost Center</Label>
          <FrappeLinkField
            meta={{ fieldname: "cost_center", label: "Cost Center", fieldtype: "Link", options: "Cost Center", placeholder: "All cost centers" }}
            value={costCenter}
            onChange={setCostCenter}
          />
        </div>
      </div>

      {!company ? (
        <EmptyState title="No company selected" description="Choose a company from the header to run this report." />
      ) : error ? (
        <EmptyState title="Couldn't load Trial Balance" description={humanizeError(error)} actionLabel="Retry" onAction={() => void mutate()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : bodyRows.length === 0 ? (
        <EmptyState title="No postings found" description="No account activity for this fiscal year / cost center." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {HEADS.map((h) => {
              const meta = HEAD_META[h];
              return (
                <KpiCard
                  key={h}
                  label={h}
                  value={money(headTotals[h])}
                  icon={meta.icon}
                  tone={meta.tone}
                  colorValue
                  sparkline={monthlyData.map((m) => m[h])}
                />
              );
            })}
          </div>

          <ChartCard
            title="Monthly activity"
            subtitle={fyMeta ? `Fiscal year ${fiscalYear} · running closing balance per head` : undefined}
            actions={
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <Button variant={chartMode === "Bars" ? "default" : "ghost"} size="sm" className="h-7 px-3" onClick={() => setChartMode("Bars")}>
                  Bars
                </Button>
                <Button variant={chartMode === "Trend" ? "default" : "ghost"} size="sm" className="h-7 px-3" onClick={() => setChartMode("Trend")}>
                  Trend
                </Button>
              </div>
            }
          >
            {chartLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : monthlyData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No monthly activity to chart.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {HEADS.map((h) => {
                    const active = !hiddenHeads.has(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => toggleHead(h)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-transparent bg-muted text-foreground"
                            : "border-border text-muted-foreground opacity-50 hover:opacity-75",
                        )}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: HEAD_META[h].hex }} />
                        {h}
                      </button>
                    );
                  })}
                </div>
                {chartMode === "Bars" ? (
                  <BarChart data={monthlyData} xKey="month" series={HEAD_SERIES.filter((s) => !hiddenHeads.has(s.key))} money />
                ) : (
                  <LineChart data={monthlyData} xKey="month" series={HEAD_SERIES.filter((s) => !hiddenHeads.has(s.key))} money />
                )}
              </>
            )}
          </ChartCard>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            {Object.values(ROOT_TYPE_COLORS).map((c) => (
              <span key={c.label} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                {c.label}
              </span>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card dark:border-white/10 dark:bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th rowSpan={2} className="border-b border-border px-4 py-2.5 text-left align-bottom text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Account
                    </th>
                    <th colSpan={2} className="border-b border-l border-border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Opening
                    </th>
                    <th colSpan={2} className="border-b border-l border-border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Activity
                    </th>
                    <th colSpan={2} className="border-b border-l border-border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Closing
                    </th>
                  </tr>
                  <tr className="bg-muted/50">
                    {["Debit", "Credit", "Debit", "Credit", "Debit", "Credit"].map((label, i) => (
                      <th
                        key={i}
                        className={cn(
                          "border-b border-border px-4 py-2 text-right text-[11px] font-semibold text-muted-foreground",
                          i % 2 === 0 && "border-l",
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const isGroup = !!r.is_group_account;
                    const isRoot = r.indent === 0;
                    const rootType = rootTypeMap.get(r.account);
                    const colors = rootType ? ROOT_TYPE_COLORS[rootType] : undefined;
                    const valueCls = cn(
                      "px-4 py-2.5 text-right tabular-nums",
                      isGroup && (isRoot ? "font-extrabold" : "font-bold"),
                    );
                    const opening = netOpening(r);
                    const closing = netClosing(r);
                    return (
                      <tr
                        key={r.account}
                        onClick={isGroup ? () => toggle(r.account) : undefined}
                        className={cn(
                          "border-b border-border/60 last:border-0",
                          isGroup ? "cursor-pointer bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/20",
                        )}
                      >
                        <td className="px-4 py-2.5" style={{ paddingLeft: 16 + r.indent * 20 }}>
                          <span
                            className={cn(
                              "inline-flex items-center gap-2",
                              isGroup && (isRoot ? "font-extrabold" : "font-semibold"),
                            )}
                          >
                            {isGroup ? (
                              collapsed.has(r.account) ? (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              )
                            ) : (
                              <span className="inline-block w-3.5 shrink-0" />
                            )}
                            {colors && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", colors.dot)} />}
                            {r.acc_number && (
                              <span className="font-mono text-xs text-muted-foreground">{r.acc_number}</span>
                            )}
                            <span className={cn("truncate", colors?.text, isRoot && "text-[15px]")}>{r.acc_name}</span>
                          </span>
                        </td>
                        <td className={cn(valueCls, "border-l border-border/60")}>{money(opening.debit)}</td>
                        <td className={valueCls}>{money(opening.credit)}</td>
                        <td className={cn(valueCls, "border-l border-border/60")}>{money(r.debit)}</td>
                        <td className={valueCls}>{money(r.credit)}</td>
                        <td className={cn(valueCls, "border-l border-border/60")}>{money(closing.debit)}</td>
                        <td className={valueCls}>{money(closing.credit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {totalRow && (
                  <tfoot>
                    <tr className="bg-muted/60">
                      <td className="border-t-2 border-border px-4 py-3 font-bold">Total</td>
                      <td className="border-l border-t-2 border-border px-4 py-3 text-right font-bold tabular-nums">{money(totalRow.opening_debit)}</td>
                      <td className="border-t-2 border-border px-4 py-3 text-right font-bold tabular-nums">{money(totalRow.opening_credit)}</td>
                      <td className="border-l border-t-2 border-border px-4 py-3 text-right font-bold tabular-nums">{money(totalRow.debit)}</td>
                      <td className="border-t-2 border-border px-4 py-3 text-right font-bold tabular-nums">{money(totalRow.credit)}</td>
                      <td className="border-l border-t-2 border-border px-4 py-3 text-right font-bold tabular-nums">{money(totalRow.closing_debit)}</td>
                      <td className="border-t-2 border-border px-4 py-3 text-right font-bold tabular-nums">{money(totalRow.closing_credit)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {totalRow && (
            <div className={cn("flex items-center gap-2 text-sm", balanced ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {balanced
                ? "Balanced — debits equal credits in all three columns."
                : `Out of balance — closing debit and credit differ by ${formatNumber(outOfBalanceBy, 2)}.`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
