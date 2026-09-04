import {
  useFrappeGetDocList,
  useFrappeGetDoc,
  useFrappeGetCall,
  useFrappeCreateDoc,
  useFrappeUpdateDoc,
  useFrappeDeleteDoc,
} from "frappe-react-sdk";
import { postCall } from "@/services/frappe";
import type {
  Account,
  CostCenter,
  FiscalYear,
  PaymentTerm,
  ModeOfPayment,
  TaxTemplate,
  JournalEntry,
  QueryReportResult,
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

/**
 * Run any standard ERPNext script report (General Ledger, Trial Balance,
 * Profit and Loss Statement, Balance Sheet, ...) via the same engine the
 * Frappe desk itself uses — no reimplementation of accounting rollups here,
 * the server computes it and we just render `columns`/`result`.
 */
export function useQueryReport(reportName: string, filters: Record<string, unknown>, enabled = true) {
  const key = enabled ? `apparel.report.${reportName}.${JSON.stringify(filters)}` : null;
  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: QueryReportResult } | QueryReportResult>(
    "frappe.desk.query_report.run",
    { report_name: reportName, filters: JSON.stringify(filters) },
    key,
  );
  const raw = data as any;
  const result: QueryReportResult | undefined = raw?.message ?? raw;
  return { data: result, isLoading, error, mutate };
}
