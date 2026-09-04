import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/pages/Dashboard/KpiCard";
import { FrappeDataTable, type ColumnDef } from "@/components/tables/data-table";
import { FrappeLinkField } from "@/components/forms/field-primitives";
import { useQueryReport, useFiscalYears } from "@/hooks/useAccounting";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { formatNumber } from "@/utils/currency";
import { asNumber } from "@/utils/cn";
import { todayISO } from "@/utils/dates";
import { humanizeError } from "@/services/frappe";
import type { QueryReportColumn } from "@/types/frappe";

/** Real filter checkboxes -> the exact filter keys erpnext.accounts.report.general_ledger.general_ledger reads. */
const GL_OPTIONS: { key: string; label: string; def: boolean }[] = [
  { key: "include_dimensions", label: "Consider accounting dimensions", def: true },
  { key: "disable_opening_balance_calculation", label: "Disable opening balance calculation", def: false },
  { key: "show_opening_entries", label: "Show opening entries", def: true },
  { key: "include_default_book_entries", label: "Include default finance book entries", def: true },
  { key: "show_cancelled_entries", label: "Show cancelled entries", def: false },
  { key: "show_net_values_in_party_account", label: "Show net values in party account", def: false },
  { key: "show_amount_in_company_currency", label: "Show credit / debit in company currency", def: false },
  { key: "add_values_in_transaction_currency", label: "Add columns in transaction currency", def: false },
  { key: "show_remarks", label: "Show remarks", def: false },
  { key: "ignore_err", label: "Ignore exchange rate revaluation journals", def: false },
  { key: "ignore_cr_dr_notes", label: "Ignore system generated credit / debit notes", def: false },
];

const PARTY_TYPES = ["Customer", "Supplier", "Employee", "Shareholder"];

// Columns the app doesn't surface by default (internal id / low-signal dupes) —
// still real report columns, just a click away via the grid's own Columns picker.
const HIDE_BY_DEFAULT = new Set(["gl_entry", "party_type", "against_voucher_type", "against_voucher", "bill_no"]);

const NUMERIC_TYPES = new Set(["Currency", "Float", "Int"]);

function isSpecialRow(r: Record<string, unknown>): boolean {
  return typeof r.account === "string" && r.account.startsWith("'") && r.account.endsWith("'");
}
function specialLabel(r: Record<string, unknown>): string {
  return String(r.account).slice(1, -1);
}

/**
 * General Ledger — every GL Entry in a date range, delegated to ERPNext's own
 * report engine (`frappe.desk.query_report.run`). Filters map 1:1 onto the
 * real filter keys the Python report reads, so results match ERPNext's own
 * desk report exactly; nothing here recomputes debit/credit/balance.
 */
export function ReportGeneralLedgerPage() {
  const { company } = useCompanyContext();
  const { data: fiscalYears } = useFiscalYears();
  const latestFY = fiscalYears?.[0];

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayISO());
  const [financeBook, setFinanceBook] = useState("");
  const [account, setAccount] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [partyType, setPartyType] = useState("");
  const [party, setParty] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [project, setProject] = useState("");
  const [opts, setOpts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GL_OPTIONS.map((o) => [o.key, o.def])),
  );

  useEffect(() => {
    if (latestFY && !fromDate) setFromDate(latestFY.year_start_date ?? "");
  }, [latestFY, fromDate]);

  const filters = useMemo(
    () => ({
      company,
      from_date: fromDate,
      to_date: toDate,
      finance_book: financeBook || undefined,
      account: account ? [account] : undefined,
      party_type: partyType || undefined,
      party: partyType && party ? [party] : undefined,
      cost_center: costCenter ? [costCenter] : undefined,
      project: project ? [project] : undefined,
      ...opts,
    }),
    [company, fromDate, toDate, financeBook, account, partyType, party, costCenter, project, opts],
  );

  const { data, error, isLoading, mutate } = useQueryReport(
    "General Ledger",
    filters,
    Boolean(company && fromDate && toDate),
  );

  const allRows = (data?.result ?? []).filter((r) => r && Object.keys(r).length > 0);
  const openingRow = allRows.find((r) => isSpecialRow(r) && specialLabel(r) === "Opening");
  const totalRow = allRows.find((r) => isSpecialRow(r) && specialLabel(r) === "Total");
  const closingRow = allRows.find((r) => isSpecialRow(r) && specialLabel(r).startsWith("Closing"));
  const entryRows = allRows.filter((r) => !isSpecialRow(r));

  const filteredRows = useMemo(
    () => (voucherType ? entryRows.filter((r) => r.voucher_type === voucherType) : entryRows),
    [entryRows, voucherType],
  );

  const voucherTypeOptions = useMemo(
    () => [...new Set(entryRows.map((r) => String(r.voucher_type ?? "")).filter(Boolean))].sort(),
    [entryRows],
  );

  const columns: QueryReportColumn[] = (data?.columns ?? []).filter((c) => !c.hidden);

  const tableColumns: ColumnDef<Record<string, unknown>>[] = useMemo(
    () =>
      columns.map((c) => {
        const numeric = NUMERIC_TYPES.has(c.fieldtype ?? "");
        return {
          key: c.fieldname,
          label: c.label,
          align: numeric ? "right" : "left",
          getValue: (r) => {
            const v = r[c.fieldname];
            return typeof v === "number" || typeof v === "string" ? v : String(v ?? "");
          },
          render: (r) => {
            const v = r[c.fieldname];
            if (v === null || v === undefined || v === "") return "—";
            if (numeric) return formatNumber(asNumber(v), c.fieldtype === "Int" ? 0 : 2);
            if (c.fieldtype === "Date") return String(v);
            return String(v);
          },
        };
      }),
    [columns],
  );

  const totalDebit = totalRow ? asNumber(totalRow.debit) : filteredRows.reduce((s, r) => s + asNumber(r.debit), 0);
  const totalCredit = totalRow ? asNumber(totalRow.credit) : filteredRows.reduce((s, r) => s + asNumber(r.credit), 0);
  const openingBalance = openingRow ? asNumber(openingRow.balance) : 0;
  const closingBalance = closingRow
    ? asNumber(closingRow.balance)
    : filteredRows.length
    ? asNumber(filteredRows[filteredRows.length - 1].balance)
    : 0;

  const activeFilterCount =
    [financeBook, account, voucherType, partyType, costCenter, project].filter(Boolean).length +
    Object.values(opts).filter(Boolean).length;

  const clearFilters = () => {
    setFinanceBook("");
    setAccount("");
    setVoucherType("");
    setPartyType("");
    setParty("");
    setCostCenter("");
    setProject("");
    setOpts(Object.fromEntries(GL_OPTIONS.map((o) => [o.key, o.def])));
  };

  return (
    <div className="space-y-4">
      <PageHeader title="General Ledger" subtitle="Every posted GL entry, account by account — computed live by ERPNext" />

      {!company ? (
        <EmptyState title="No company selected" description="Choose a company from the header to run this report." />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filters
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {activeFilterCount} active
                </span>
              </span>
              {filtersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {filtersOpen && (
              <div className="border-t border-border p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label htmlFor="gl-from">From Date</Label>
                    <Input id="gl-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="gl-to">To Date</Label>
                    <Input id="gl-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Finance Book</Label>
                    <FrappeLinkField
                      meta={{ fieldname: "finance_book", label: "Finance Book", fieldtype: "Link", options: "Finance Book", placeholder: "All books" }}
                      value={financeBook}
                      onChange={setFinanceBook}
                    />
                  </div>
                  <div>
                    <Label>Account</Label>
                    <FrappeLinkField
                      meta={{ fieldname: "account", label: "Account", fieldtype: "Link", options: "Account", placeholder: "All accounts" }}
                      value={account}
                      onChange={setAccount}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gl-voucher-type">Voucher Type</Label>
                    <Select id="gl-voucher-type" value={voucherType} onChange={(e) => setVoucherType(e.target.value)}>
                      <option value="">All types</option>
                      {voucherTypeOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="gl-party-type">Party Type</Label>
                    <Select
                      id="gl-party-type"
                      value={partyType}
                      onChange={(e) => {
                        setPartyType(e.target.value);
                        setParty("");
                      }}
                    >
                      <option value="">Any party</option>
                      {PARTY_TYPES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Party</Label>
                    <FrappeLinkField
                      meta={{ fieldname: "party", label: "Party", fieldtype: "Link", options: partyType || "Customer", placeholder: partyType ? `Search ${partyType}…` : "Choose a party type first" }}
                      value={party}
                      onChange={setParty}
                      disabled={!partyType}
                    />
                  </div>
                  <div>
                    <Label>Cost Center</Label>
                    <FrappeLinkField
                      meta={{ fieldname: "cost_center", label: "Cost Center", fieldtype: "Link", options: "Cost Center", placeholder: "All cost centers" }}
                      value={costCenter}
                      onChange={setCostCenter}
                    />
                  </div>
                  <div>
                    <Label>Project</Label>
                    <FrappeLinkField
                      meta={{ fieldname: "project", label: "Project", fieldtype: "Link", options: "Project", placeholder: "All projects" }}
                      value={project}
                      onChange={setProject}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {GL_OPTIONS.map((o) => (
                    <Checkbox
                      key={o.key}
                      label={o.label}
                      checked={!!opts[o.key]}
                      onChange={(e) => setOpts((prev) => ({ ...prev, [o.key]: e.target.checked }))}
                    />
                  ))}
                </div>

                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Opening Balance" value={formatNumber(openingBalance, 2)} loading={isLoading} />
            <KpiCard label="Total Debit" value={formatNumber(totalDebit, 2)} loading={isLoading} />
            <KpiCard label="Total Credit" value={formatNumber(totalCredit, 2)} loading={isLoading} />
            <KpiCard label="Closing Balance" value={formatNumber(closingBalance, 2)} tone="info" loading={isLoading} />
          </div>

          <FrappeDataTable
            columns={tableColumns}
            rows={filteredRows}
            rowKey={(r) => String(r.gl_entry)}
            loading={isLoading}
            error={error}
            onRetry={() => void mutate()}
            searchPlaceholder="Search account, voucher, party, remarks…"
            exportFilename="general-ledger"
            title="Ledger Entries"
            subtitle={`${filteredRows.length} entries${totalRow ? "" : " (partial totals — no report summary row for this filter set)"}`}
            emptyTitle="No GL entries"
            emptyDescription={error ? humanizeError(error) : "No GL entries posted in this date range for the selected filters."}
            initialPageSize={25}
            pageSizeOptions={[25, 50, 100]}
            defaultHiddenColumns={columns.filter((c) => HIDE_BY_DEFAULT.has(c.fieldname)).map((c) => c.fieldname)}
            defaultSortKey="posting_date"
          />
        </>
      )}
    </div>
  );
}
