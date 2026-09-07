import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  useFrappeGetDocList,
  useFrappeGetDoc,
  useFrappeGetCall,
  useFrappeCreateDoc,
  useFrappeUpdateDoc,
  useFrappeDeleteDoc,
} from "frappe-react-sdk";
import { postCall, getCall, http } from "@/services/frappe";
import { asNumber } from "@/utils/cn";
import type {
  Account,
  CostCenter,
  FiscalYear,
  PaymentTerm,
  ModeOfPayment,
  TaxTemplate,
  JournalEntry,
  QueryReportResult,
  RawQueryReportResponse,
  PreparedReportDoc,
} from "@/types/frappe";

// ------------------------------------------------------------- Chart of Accounts

const ACCOUNT_FIELDS = [
  "name",
  "account_name",
  "account_number",
  "parent_account",
  "is_group",
  "root_type",
  "report_type",
  "account_type",
  "account_currency",
  "company",
  "disabled",
  "lft",
] as const;

/** Full flat Chart of Accounts for a company — build the tree client-side from `parent_account`. */
export function useChartOfAccounts(company?: string, enabled = true) {
  return useFrappeGetDocList<Account>(
    "Account",
    {
      fields: ACCOUNT_FIELDS as unknown as (keyof Account)[],
      filters: (company ? [["company", "=", company]] : []) as any,
      limit: 0,
      orderBy: { field: "lft", order: "asc" },
    },
    enabled && company ? `apparel.coa.${company}` : null,
  );
}

/** Leaf (postable) accounts only — for pickers like the Journal Entry row editor. */
export function usePostableAccounts(company?: string) {
  const { data, isLoading } = useChartOfAccounts(company);
  return { data: (data ?? []).filter((a) => !a.is_group), isLoading };
}

// ------------------------------------------------------------------- Cost Center

export function useCostCenters(company?: string, enabled = true) {
  return useFrappeGetDocList<CostCenter>(
    "Cost Center",
    {
      fields: ["name", "cost_center_name", "parent_cost_center", "is_group", "company", "disabled"],
      filters: (company ? [["company", "=", company]] : []) as any,
      limit: 0,
      orderBy: { field: "name", order: "asc" },
    },
    enabled ? `apparel.cost-centers.${company ?? "all"}` : null,
  );
}

// ------------------------------------------------------------------- Fiscal Year

export function useFiscalYears(enabled = true) {
  return useFrappeGetDocList<FiscalYear>(
    "Fiscal Year",
    {
      fields: ["name", "year_start_date", "year_end_date", "disabled"],
      limit: 0,
      orderBy: { field: "year_start_date", order: "desc" },
    },
    enabled ? "apparel.fiscal-years" : null,
  );
}

// ----------------------------------------------------------------- Payment Term

export function usePaymentTerms(enabled = true) {
  return useFrappeGetDocList<PaymentTerm>(
    "Payment Term",
    {
      fields: ["name", "payment_term_name", "invoice_portion", "due_date_based_on", "credit_days", "discount"],
      limit: 0,
      orderBy: { field: "name", order: "asc" },
    },
    enabled ? "apparel.payment-terms" : null,
  );
}

// ------------------------------------------------------------- Mode of Payment

export function useModesOfPayment(enabled = true) {
  return useFrappeGetDocList<ModeOfPayment>(
    "Mode of Payment",
    {
      fields: ["name", "type", "enabled"],
      limit: 0,
      orderBy: { field: "name", order: "asc" },
    },
    enabled ? "apparel.modes-of-payment" : null,
  );
}

// ------------------------------------------------------------------ Tax Templates

/** Sales or Purchase Taxes and Charges Template list. */
export function useTaxTemplates(
  doctype: "Sales Taxes and Charges Template" | "Purchase Taxes and Charges Template",
  company?: string,
  enabled = true,
) {
  return useFrappeGetDocList<TaxTemplate>(
    doctype,
    {
      fields: ["name", "title", "company", "is_default", "disabled"],
      filters: (company ? [["company", "=", company]] : []) as any,
      limit: 0,
      orderBy: { field: "modified", order: "desc" },
    },
    enabled ? `apparel.tax-templates.${doctype}.${company ?? "all"}` : null,
  );
}

// ------------------------------------------------------------------- Journal Entry

const JE_LIST_FIELDS = [
  "name",
  "voucher_type",
  "company",
  "posting_date",
  "total_debit",
  "total_credit",
  "user_remark",
  "docstatus",
] as const;

export function useJournalEntries(args?: { filters?: unknown[][]; limit?: number; enabled?: boolean }) {
  const { filters = [], limit = 200, enabled = true } = args ?? {};
  return useFrappeGetDocList<JournalEntry>(
    "Journal Entry",
    {
      fields: JE_LIST_FIELDS as unknown as (keyof JournalEntry)[],
      filters: filters as any,
      limit,
      orderBy: { field: "posting_date", order: "desc" },
    },
    enabled ? `apparel.je.${JSON.stringify({ filters, limit })}` : null,
  );
}

export function useJournalEntry(name?: string) {
  return useFrappeGetDoc<JournalEntry>("Journal Entry", name ?? undefined, name ? `apparel.je.doc.${name}` : null);
}

export function useJournalEntryMutations() {
  const create = useFrappeCreateDoc<JournalEntry>();
  const update = useFrappeUpdateDoc<JournalEntry>();
  const del = useFrappeDeleteDoc();

  return {
    createDoc: (values: Partial<JournalEntry>) => create.createDoc("Journal Entry", values as JournalEntry),
    updateDoc: (name: string, values: Partial<JournalEntry>) => update.updateDoc("Journal Entry", name, values),
    deleteDoc: (name: string) => del.deleteDoc("Journal Entry", name),
    loading: create.loading || update.loading || del.loading,
    error: create.error || update.error || del.error,
  };
}

/** Submit a saved (draft) Journal Entry — same submit pattern used by Landed Cost Voucher. */
export async function submitJournalEntry(name: string): Promise<void> {
  const full = await postCall<JournalEntry>("frappe.client.get", { doctype: "Journal Entry", name });
  await postCall("frappe.client.submit", { doc: full });
}

// -------------------------------------------------------------------- Reports

const PREPARED_REPORT_POLL_MS = 2500;

/** Order-independent snapshot of a flat filters object, for comparing two filter sets regardless of key order. */
function sortedEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.keys(obj)
    .sort()
    .map((k) => [k, obj[k]]);
}

/**
 * Plain-async counterpart to `useQueryReport`'s prepared-report handling,
 * for callers that need to await a report result outside a hook (e.g. inside
 * a `Promise.all` over several small requests) rather than render around it.
 * `prepared_report` is a sticky flag on the Report doctype itself, not a
 * per-request decision — once any call for a report trips ERPNext's
 * execution-time threshold, *every* future call for that report name comes
 * back as `{prepared_report: true, doc: null}` regardless of how cheap that
 * particular call actually is, so this always has to be ready to enqueue and
 * poll a background job rather than assume a small request stays inline.
 */
async function fetchReportResult(reportName: string, filters: Record<string, unknown>): Promise<QueryReportResult> {
  const initial = await getCall<{ message?: RawQueryReportResponse } & RawQueryReportResponse>("frappe.desk.query_report.run", {
    report_name: reportName,
    filters: JSON.stringify(filters),
  });
  const raw = initial.message ?? initial;
  if (raw.result) return raw as QueryReportResult;

  let docName = raw.doc?.name;
  if (!docName) {
    // Reuse an already-running job for the same report+filters instead of
    // enqueueing a duplicate one (see useQueryReport for why).
    const inFlight = await getCall<{ name: string; filters: string }[]>("frappe.client.get_list", {
      doctype: "Prepared Report",
      filters: JSON.stringify([
        ["report_name", "=", reportName],
        ["status", "in", ["Queued", "Started"]],
      ]),
      fields: JSON.stringify(["name", "filters"]),
      order_by: "creation desc",
      limit_page_length: 10,
    });
    const target = sortedEntries(filters);
    const match = inFlight.find((d) => {
      try {
        return JSON.stringify(sortedEntries(JSON.parse(d.filters))) === JSON.stringify(target);
      } catch {
        return false;
      }
    });
    docName = match
      ? match.name
      : (
          await postCall<{ name: string }>("frappe.core.doctype.prepared_report.prepared_report.make_prepared_report", {
            report_name: reportName,
            filters: JSON.stringify(filters),
          })
        ).name;
  }

  for (;;) {
    const res = await http.get<{ data: PreparedReportDoc }>(`/api/resource/Prepared Report/${encodeURIComponent(docName)}`);
    const status = res.data.data.status;
    if (status === "Completed") break;
    if (status === "Error" || status === "Failed") {
      throw new Error("Report generation failed on the server. Try again or check the Prepared Report log.");
    }
    await new Promise((r) => setTimeout(r, PREPARED_REPORT_POLL_MS));
  }

  const final = await getCall<{ message?: RawQueryReportResponse } & RawQueryReportResponse>("frappe.desk.query_report.run", {
    report_name: reportName,
    filters: JSON.stringify(filters),
  });
  return (final.message ?? final) as QueryReportResult;
}

/**
 * Run any standard ERPNext script report (General Ledger, Trial Balance,
 * Profit and Loss Statement, Balance Sheet, ...) via the same engine the
 * Frappe desk itself uses — no reimplementation of accounting rollups here,
 * the server computes it and we just render `columns`/`result`.
 *
 * Some reports on a given site are configured as a background "Prepared
 * Report" (heavy reports the admin has flagged to run as a job rather than
 * inline) — `run` alone then returns no data at all, just
 * `{prepared_report: true, doc: null}`. When that happens this kicks off
 * generation (`prepared_report.make_prepared_report`), polls the job's
 * status, and re-runs once it completes — callers see this only as
 * `isPreparing` staying true a little longer than a normal `isLoading`.
 */
export function useQueryReport(reportName: string, filters: Record<string, unknown>, enabled = true) {
  const key = enabled ? `apparel.report.${reportName}.${JSON.stringify(filters)}` : null;
  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: RawQueryReportResponse } | RawQueryReportResponse>(
    "frappe.desk.query_report.run",
    { report_name: reportName, filters: JSON.stringify(filters) },
    key,
  );
  const raw = data as { message?: RawQueryReportResponse } & RawQueryReportResponse | undefined;
  const initial: RawQueryReportResponse | undefined = raw?.message ?? raw;

  const pending = Boolean(initial?.prepared_report && !initial?.result);

  const [resolved, setResolved] = useState<QueryReportResult | undefined>(undefined);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<Error | null>(null);
  const startedForKey = useRef<string | null>(null);

  useEffect(() => {
    if (!key) return;
    if (!pending) {
      if (initial?.result) setResolved(initial as QueryReportResult);
      return;
    }
    if (startedForKey.current === key) return; // already generating/polling this exact filter set
    startedForKey.current = key;
    setIsPreparing(true);
    setPrepareError(null);
    setResolved(undefined);

    let cancelled = false;
    (async () => {
      try {
        let docName = initial?.doc?.name;
        if (!docName) {
          // Reuse an already-running job for the same report+filters instead
          // of blindly enqueueing another one — remounting this hook (e.g.
          // switching report tabs and back while a job is still generating)
          // would otherwise spawn a redundant background job every time,
          // competing with itself for the same worker and slowing everyone
          // down. Compared key-by-key (not by raw string) since the server
          // may re-serialize the stored `filters` JSON in a different key
          // order than we sent it.
          const inFlight = await getCall<{ name: string; filters: string }[]>("frappe.client.get_list", {
            doctype: "Prepared Report",
            filters: JSON.stringify([
              ["report_name", "=", reportName],
              ["status", "in", ["Queued", "Started"]],
            ]),
            fields: JSON.stringify(["name", "filters"]),
            order_by: "creation desc",
            limit_page_length: 10,
          });
          const target = sortedEntries(filters);
          const match = inFlight.find((d) => {
            try {
              return JSON.stringify(sortedEntries(JSON.parse(d.filters))) === JSON.stringify(target);
            } catch {
              return false;
            }
          });
          if (match) {
            docName = match.name;
          } else {
            const enqueued = await postCall<{ name: string }>(
              "frappe.core.doctype.prepared_report.prepared_report.make_prepared_report",
              { report_name: reportName, filters: JSON.stringify(filters) },
            );
            docName = enqueued.name;
          }
        }
        while (!cancelled) {
          const res = await http.get<{ data: PreparedReportDoc }>(
            `/api/resource/Prepared Report/${encodeURIComponent(docName)}`,
          );
          const status = res.data.data.status;
          if (status === "Completed") break;
          if (status === "Error" || status === "Failed") {
            throw new Error("Report generation failed on the server. Try again or check the Prepared Report log.");
          }
          await new Promise((r) => setTimeout(r, PREPARED_REPORT_POLL_MS));
        }
        if (!cancelled) {
          // Fetch the now-completed report directly rather than relying on
          // `mutate()` re-triggering a network call — the SWR layer treats
          // the earlier `{prepared_report: true, doc: null}` response as
          // valid cached data for this key, so a plain revalidation call is
          // not guaranteed to actually refetch.
          const final = await getCall<RawQueryReportResponse>("frappe.desk.query_report.run", {
            report_name: reportName,
            filters: JSON.stringify(filters),
          });
          if (!cancelled) setResolved(final as QueryReportResult);
          void mutate(); // best-effort: keep the SWR cache in sync too
        }
      } catch (e) {
        if (!cancelled) setPrepareError(e as Error);
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pending]);

  const result: QueryReportResult | undefined = pending ? resolved : (initial as QueryReportResult | undefined);

  return {
    data: result,
    isLoading: isLoading || isPreparing,
    isPreparing,
    error: prepareError ?? error,
    mutate,
  };
}

/** One calendar month's root-level (indent 0) account activity, keyed by account name. */
export interface MonthlyRootActivity {
  month: string;
  totals: Record<string, { debit: number; credit: number }>;
}

function buildMonthRanges(fromDate: string, toDate: string) {
  const start0 = new Date(fromDate);
  const rangeEnd = new Date(toDate);
  const months: { from: string; to: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(start0.getFullYear(), start0.getMonth() + i, 1);
    if (monthStart > rangeEnd) break;
    const monthEnd = new Date(start0.getFullYear(), start0.getMonth() + i + 1, 0);
    const clampedStart = monthStart < start0 ? start0 : monthStart;
    const clampedEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
    months.push({
      from: clampedStart.toISOString().slice(0, 10),
      to: clampedEnd.toISOString().slice(0, 10),
      label: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    });
  }
  return months;
}

/**
 * Cheap month-by-month trend for the Trial Balance chart, built from N small
 * Trial Balance calls (one per calendar month in the range) rather than one
 * `General Ledger` call for every raw posting across the whole range.
 *
 * Trial Balance is already a server-aggregated per-account snapshot (the
 * same report this page uses for its own totals) — a single month of it is
 * cheap regardless of how much history the account has, unlike fetching
 * every GL row for a full fiscal year, which is what pushed `General Ledger`
 * into background "Prepared Report" mode for accounts with heavy activity.
 */
export function useMonthlyTrialBalanceTrend(
  company: string | undefined,
  fiscalYear: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined,
  enabled = true,
) {
  const months = useMemo(() => (fromDate && toDate ? buildMonthRanges(fromDate, toDate) : []), [fromDate, toDate]);
  const key =
    enabled && company && fiscalYear && months.length > 0 ? `apparel.report.monthly-trial-balance.${company}.${fiscalYear}.${fromDate}.${toDate}` : null;

  const { data, error, isLoading, mutate } = useSWR<MonthlyRootActivity[]>(key, async () => {
    const responses = await Promise.all(
      // Trial Balance requires `fiscal_year` even when from_date/to_date
      // narrow the window — it's the fiscal year the whole page has
      // selected, not a per-month value, since from_date/to_date already
      // pin the actual range each call covers.
      months.map((m) => fetchReportResult("Trial Balance", { company, fiscal_year: fiscalYear, from_date: m.from, to_date: m.to, show_group_accounts: 1 })),
    );
    return months.map((m, i) => {
      const rows = (responses[i]?.result ?? []) as Record<string, unknown>[];
      const totals: Record<string, { debit: number; credit: number }> = {};
      rows.forEach((r) => {
        if (!r || typeof r.account !== "string" || Number(r.indent) !== 0) return;
        totals[r.account] = { debit: asNumber(r.debit), credit: asNumber(r.credit) };
      });
      return { month: m.label, totals };
    });
  });

  return { data, isLoading, error, mutate };
}
