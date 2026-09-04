import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Receipt } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { BarChart, DonutChart } from "@/components/charts/charts";
import { KpiCard } from "@/pages/Dashboard/KpiCard";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { formatMoney } from "@/utils/currency";
import { asNumber } from "@/utils/cn";

interface GLRow {
  posting_date: string;
  debit: number;
  credit: number;
  voucher_type: string;
}

function monthlyDebitCredit(rows: GLRow[] | undefined) {
  const map = new Map<string, { month: string; debit: number; credit: number }>();
  (rows ?? []).forEach((r) => {
    const d = new Date(r.posting_date);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const entry = map.get(key) ?? { month: label, debit: 0, credit: 0 };
    entry.debit += asNumber(r.debit);
    entry.credit += asNumber(r.credit);
    map.set(key, entry);
  });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v).slice(-12);
}

function byVoucherType(rows: GLRow[] | undefined) {
  const map = new Map<string, number>();
  (rows ?? []).forEach((r) => {
    map.set(r.voucher_type, (map.get(r.voucher_type) ?? 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Accounting Dashboard — real KPIs and charts from live GL Entry / Payment Entry / Purchase Invoice data. */
export function AccountingDashboardPage() {
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const coFilter = companyFilter(company);

  const { data: glEntries, isLoading: glLoading } = useFrappeGetDocList<GLRow>(
    "GL Entry",
    {
      fields: ["posting_date", "debit", "credit", "voucher_type"] as any,
      filters: [...coFilter, ["is_cancelled", "=", 0]] as any,
      limit: 1000,
      orderBy: { field: "posting_date", order: "desc" },
    },
    `apparel.acct-dash.gl.${company ?? "all"}`,
  );

  const { data: payments, isLoading: paymentsLoading } = useFrappeGetDocList<Record<string, any>>(
    "Payment Entry",
    {
      fields: ["payment_type", "paid_amount", "received_amount", "docstatus"] as any,
      filters: [...coFilter, ["docstatus", "=", 1]] as any,
      limit: 500,
    },
    `apparel.acct-dash.payments.${company ?? "all"}`,
  );

  const { data: purchaseInvoices, isLoading: piLoading } = useFrappeGetDocList<Record<string, any>>(
    "Purchase Invoice",
    {
      fields: ["outstanding_amount", "docstatus"] as any,
      filters: [...coFilter, ["docstatus", "=", 1]] as any,
      limit: 500,
    },
    `apparel.acct-dash.pi.${company ?? "all"}`,
  );

  const kpis = useMemo(() => {
    const received = (payments ?? [])
      .filter((p) => p.payment_type === "Receive")
      .reduce((s, p) => s + asNumber(p.received_amount), 0);
    const paid = (payments ?? [])
      .filter((p) => p.payment_type === "Pay")
      .reduce((s, p) => s + asNumber(p.paid_amount), 0);
    const outstandingPayable = (purchaseInvoices ?? []).reduce((s, p) => s + asNumber(p.outstanding_amount), 0);
    return { received, paid, outstandingPayable, glCount: glEntries?.length ?? 0 };
  }, [payments, purchaseInvoices, glEntries]);

  const loading = glLoading || paymentsLoading || piLoading;
  const monthly = monthlyDebitCredit(glEntries);
  const voucherBreakdown = byVoucherType(glEntries);

  return (
    <div className="space-y-5">
      <PageHeader title="Accounting Dashboard" subtitle={company ? `Company: ${company}` : "All companies"} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Payments Received" value={formatMoney(kpis.received, "USD", { compact: true })} icon={ArrowDownCircle} tone="success" loading={loading} onClick={() => navigate("/purchase/invoices")} />
        <KpiCard label="Payments Made" value={formatMoney(kpis.paid, "USD", { compact: true })} icon={ArrowUpCircle} tone="warning" loading={loading} onClick={() => navigate("/purchase/invoices")} />
        <KpiCard label="Outstanding Payable" value={formatMoney(kpis.outstandingPayable, "USD", { compact: true })} icon={Wallet} tone="destructive" loading={loading} onClick={() => navigate("/accounting/reports/trial-balance")} />
        <KpiCard label="GL Entries Posted" value={kpis.glCount} icon={Receipt} loading={loading} onClick={() => navigate("/accounting/reports/general-ledger")} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Monthly Ledger Activity" subtitle="Total debit vs. credit posted per month">
          <BarChart data={monthly} xKey="month" series={[{ key: "debit", label: "Debit" }, { key: "credit", label: "Credit" }]} money legend />
        </ChartCard>
        <ChartCard title="Entries by Voucher Type" subtitle="What's driving your GL postings">
          <DonutChart data={voucherBreakdown} />
        </ChartCard>
      </div>
    </div>
  );
}
