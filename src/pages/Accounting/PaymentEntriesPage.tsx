import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FrappeDataTable, type ColumnDef } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { usePaymentEntries } from "@/hooks/usePaymentEntries";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import type { PaymentEntry } from "@/types/frappe";

const DOCSTATUS_LABEL: Record<number, string> = { 0: "Draft", 1: "Submitted", 2: "Cancelled" };

export function PaymentEntriesPage() {
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const { data, error, isLoading, mutate } = usePaymentEntries({ filters: companyFilter(company) });

  const columns: ColumnDef<PaymentEntry>[] = [
    { key: "name", label: "Payment Entry", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "payment_type", label: "Type" },
    { key: "posting_date", label: "Posting Date", render: (r) => formatDate(r.posting_date) },
    { key: "party", label: "Party", render: (r) => r.party_name || r.party || "—" },
    { key: "mode_of_payment", label: "Mode of Payment" },
    { key: "paid_amount", label: "Paid Amount", align: "right", render: (r) => formatMoney(r.paid_amount, r.paid_from_account_currency) },
    { key: "received_amount", label: "Received Amount", align: "right", render: (r) => formatMoney(r.received_amount, r.paid_to_account_currency) },
    { key: "docstatus", label: "Status", render: (r) => <StatusBadge status={DOCSTATUS_LABEL[r.docstatus ?? 0]} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment Entries"
        subtitle="Money received from / paid to customers, suppliers and other parties, and internal transfers"
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate("/accounting/payment-entries/new")}>
            <Plus className="h-4 w-4" /> New Payment Entry
          </Button>
        }
      />
      <FrappeDataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(r) => String(r.name)}
        loading={isLoading}
        error={error}
        onRetry={() => void mutate()}
        onRowClick={(r) => navigate(`/accounting/payment-entries/${encodeURIComponent(String(r.name))}`)}
        title="Payment Entries"
        subtitle={`${data?.length ?? 0} entries`}
        exportFilename="payment-entries"
        emptyTitle="No payment entries yet"
        emptyDescription='Payments you record will show up here — click "New Payment Entry" to create one.'
      />
    </div>
  );
}
