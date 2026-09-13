import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FileText, Plus, Eye, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { FrappeDataTable, type ColumnDef } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSalesInvoices, useSalesInvoiceMutations } from "@/hooks/useSalesInvoices";
import { useCustomerOptions } from "@/hooks/useCustomers";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import { humanizeError } from "@/services/frappe";
import type { SalesInvoice } from "@/types/frappe";

const SI_STATUSES = ["Draft", "Unpaid", "Paid", "Overdue", "Cancelled", "Return"];

export function SalesInvoicesPage() {
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const { options: customers } = useCustomerOptions();

  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SalesInvoice | null>(null);

  const filters = useMemo(() => {
    const f: unknown[][] = [...companyFilter(company), ["docstatus", "<", 2]];
    if (customer) f.push(["customer", "=", customer]);
    if (status) f.push(["status", "=", status]);
    if (fromDate) f.push(["posting_date", ">=", fromDate]);
    if (toDate) f.push(["posting_date", "<=", toDate]);
    return f;
  }, [company, customer, status, fromDate, toDate]);

  const { data, error, isLoading, mutate } = useSalesInvoices({ filters, limit: 500 });
  const { deleteDoc, loading: deleting } = useSalesInvoiceMutations();

  const columns: ColumnDef<SalesInvoice>[] = [
    { key: "name", label: "Invoice", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "customer", label: "Customer", render: (r) => r.customer_name || r.customer },
    { key: "posting_date", label: "Date", render: (r) => formatDate(r.posting_date) },
    { key: "due_date", label: "Due Date", render: (r) => formatDate(r.due_date) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status || "Draft"} /> },
    {
      key: "grand_total",
      label: "Total",
      align: "right",
      getValue: (r) => Number(r.grand_total ?? 0),
      render: (r) => formatMoney(r.grand_total, r.currency),
    },
    {
      key: "outstanding_amount",
      label: "Outstanding",
      align: "right",
      getValue: (r) => Number(r.outstanding_amount ?? 0),
      render: (r) => formatMoney(r.outstanding_amount, r.currency),
    },
  ];

  const confirmDelete = async () => {
    if (!pendingDelete?.name) return;
    try {
      await deleteDoc(pendingDelete.name);
      toast.success(`Deleted ${pendingDelete.name}`);
      setPendingDelete(null);
      notifyDataChanged();
      void mutate();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Sales Invoices"
        subtitle="Billed to customers — the selling side of accounts receivable"
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button variant="primary" onClick={() => navigate("/selling/sales-invoices/new")}>
            <Plus className="h-4 w-4" /> New Sales Invoice
          </Button>
        }
      />

      <FrappeDataTable<SalesInvoice>
        columns={columns}
        rows={data ?? []}
        rowKey={(r) => r.name ?? ""}
        loading={isLoading}
        error={error}
        onRetry={() => void mutate()}
        onRowClick={(r) => navigate(`/selling/sales-invoices/${encodeURIComponent(r.name ?? "")}`)}
        exportFilename="sales-invoices"
        emptyTitle="No Sales Invoices"
        emptyDescription="Create a sales invoice directly, or from a submitted Sales Order/Delivery Note."
        searchPlaceholder="Search invoice, customer…"
        rowActions={(r) => [
          {
            label: "Open",
            icon: <Eye className="h-4 w-4" />,
            onClick: () => navigate(`/selling/sales-invoices/${encodeURIComponent(r.name ?? "")}`),
          },
          { separator: true, label: "" },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            destructive: true,
            onClick: () => setPendingDelete(r),
          },
        ]}
        filters={
          <FilterBar>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Customer</label>
              <Select value={customer} onChange={(e) => setCustomer(e.target.value)} className="h-8 w-44 text-xs">
                <option value="">All customers</option>
                {customers.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 w-40 text-xs">
                <option value="">All statuses</option>
                {SI_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-36 text-xs" aria-label="Posting date from" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-36 text-xs" aria-label="Posting date to" />
            </div>
          </FilterBar>
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name}?`}
        description="This permanently removes the Sales Invoice from ERPNext (draft documents only)."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
