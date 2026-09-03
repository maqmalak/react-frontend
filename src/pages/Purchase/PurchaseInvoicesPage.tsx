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
import { usePurchaseInvoices, usePurchaseInvoiceMutations } from "@/hooks/usePurchaseInvoices";
import { useSupplierOptions } from "@/hooks/useSuppliers";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import { humanizeError } from "@/services/frappe";
import type { PurchaseInvoice } from "@/types/frappe";

const PI_STATUSES = [
  "Draft",
  "Submitted",
  "Unpaid",
  "Partly Paid",
  "Paid",
  "Overdue",
  "Return",
  "Debit Note Issued",
  "Cancelled",
  "Internal Transfer",
];

export function PurchaseInvoicesPage() {
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const { options: suppliers } = useSupplierOptions();

  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PurchaseInvoice | null>(null);

  const filters = useMemo(() => {
    const f: unknown[][] = [...companyFilter(company), ["docstatus", "<", 2]];
    if (supplier) f.push(["supplier", "=", supplier]);
    if (status) f.push(["status", "=", status]);
    if (fromDate) f.push(["posting_date", ">=", fromDate]);
    if (toDate) f.push(["posting_date", "<=", toDate]);
    return f;
  }, [company, supplier, status, fromDate, toDate]);

  const { data, error, isLoading, mutate } = usePurchaseInvoices({ filters, limit: 500 });
  const { deleteDoc, loading: deleting } = usePurchaseInvoiceMutations();

  const columns: ColumnDef<PurchaseInvoice>[] = [
    {
      key: "name",
      label: "Invoice",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (r) => r.supplier_name || r.supplier,
    },
    {
      key: "posting_date",
      label: "Date",
      render: (r) => formatDate(r.posting_date),
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (r) => formatDate(r.due_date),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status || "Draft"} />,
    },
    {
      key: "outstanding_amount",
      label: "Outstanding",
      align: "right",
      getValue: (r) => Number(r.outstanding_amount ?? 0),
      render: (r) => formatMoney(r.outstanding_amount, r.currency),
    },
    {
      key: "grand_total",
      label: "Total",
      align: "right",
      getValue: (r) => Number(r.grand_total ?? 0),
      render: (r) => formatMoney(r.grand_total, r.currency),
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
        title="Purchase Invoices"
        subtitle="Supplier bills for import purchases"
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button variant="primary" onClick={() => navigate("/purchase/invoices/new")}>
            <Plus className="h-4 w-4" /> New Purchase Invoice
          </Button>
        }
      />

      <FrappeDataTable<PurchaseInvoice>
        columns={columns}
        rows={data ?? []}
        rowKey={(r) => r.name ?? ""}
        loading={isLoading}
        error={error}
        onRetry={() => void mutate()}
        onRowClick={(r) => navigate(`/purchase/invoices/${encodeURIComponent(r.name ?? "")}`)}
        exportFilename="purchase-invoices"
        emptyTitle="No Purchase Invoices"
        emptyDescription="Bill against a Purchase Receipt/Order, or create an invoice manually."
        searchPlaceholder="Search invoice, supplier…"
        rowActions={(r) => [
          {
            label: "Open",
            icon: <Eye className="h-4 w-4" />,
            onClick: () => navigate(`/purchase/invoices/${encodeURIComponent(r.name ?? "")}`),
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
              <label className="text-xs font-medium text-muted-foreground">Supplier</label>
              <Select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="h-8 w-44 text-xs"
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-8 w-40 text-xs"
              >
                <option value="">All statuses</option>
                {PI_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-36 text-xs"
                aria-label="Posting date from"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-36 text-xs"
                aria-label="Posting date to"
              />
            </div>
          </FilterBar>
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name}?`}
        description="This permanently removes the Purchase Invoice from ERPNext (draft documents only)."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
