import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, FileText, Pencil, Trash2, Handshake, Package, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GLLedgerPanel } from "@/components/common/gl-ledger-panel";
import { useSalesInvoice, useSalesInvoiceMutations } from "@/hooks/useSalesInvoices";
import { usePaymentEntriesForSalesInvoice } from "@/hooks/usePaymentEntries";
import { useAuth } from "@/hooks/useAuth";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import type { SalesInvoice, SalesInvoiceItem } from "@/types/frappe";

function lineAmount(row: Pick<SalesInvoiceItem, "qty" | "rate">): number {
  return Number(row.qty || 0) * Number(row.rate || 0);
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value == null || value === "" ? "—" : value}</span>
    </div>
  );
}

/** Sales Invoice view page — terminal document in the Selling chain, so no forward "Create X" action. */
export function SalesInvoiceDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole();

  const { data: doc, error, isLoading, mutate } = useSalesInvoice(name);
  const { deleteDoc, loading: deleteLoading } = useSalesInvoiceMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: paymentEntries,
    isLoading: peLoading,
    error: peError,
  } = usePaymentEntriesForSalesInvoice(name);

  const handleDelete = async () => {
    if (!name) return;
    try {
      await deleteDoc(name);
      toast.success("Sales Invoice deleted");
      notifyDataChanged();
      navigate("/selling/sales-invoices");
    } catch (err) {
      toast.error(humanizeError(err));
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sales Invoice" />
        <SectionCard>
          <p className="text-sm text-destructive">Failed to load sales invoice {name}.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void mutate()}>
            Retry
          </Button>
        </SectionCard>
      </div>
    );
  }

  const si = doc as SalesInvoice;
  const items = si.items ?? [];
  const totalQty = items.reduce((s, it) => s + Number(it.qty || 0), 0);
  const editable = canWrite && (si.docstatus ?? 0) === 0;
  const salesOrder = items.find((it) => it.sales_order)?.sales_order;
  const deliveryNote = items.find((it) => it.delivery_note)?.delivery_note;

  const statusLabel = si.status || (si.docstatus === 1 ? "Submitted" : si.docstatus === 2 ? "Cancelled" : "Draft");

  return (
    <div className="space-y-6">
      <PageHeader
        title={si.name || name!}
        subtitle="Sales Invoice"
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={
          <Link to="/selling/sales-invoices" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Sales Invoices
          </Link>
        }
        actions={
          <>
            <StatusBadge status={statusLabel} />
            {editable && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(`/selling/sales-invoices/${encodeURIComponent(name!)}/edit`)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={deleteLoading}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge status={statusLabel} />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-medium">{si.customer_name || si.customer || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Currency</p>
          <p className="font-medium">{si.currency || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="font-bold">{formatMoney(si.outstanding_amount, si.currency)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Invoice Details">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Row label="Customer" value={si.customer_name || si.customer} />
              <Row label="Company" value={si.company} />
              <Row label="Posting Date" value={formatDate(si.posting_date)} />
              <Row label="Due Date" value={formatDate(si.due_date)} />
              <Row label="Currency" value={si.currency} />
              <Row label="Conversion Rate" value={si.conversion_rate ?? 1} />
              <Row label="Total Qty" value={totalQty} />
              <Row label="Net Total" value={si.net_total != null ? formatMoney(si.net_total, si.currency) : undefined} />
              <Row label="Grand Total" value={si.grand_total != null ? formatMoney(si.grand_total, si.currency) : undefined} />
              <Row label="Outstanding" value={si.outstanding_amount != null ? formatMoney(si.outstanding_amount, si.currency) : undefined} />
            </div>
          </SectionCard>

          <SectionCard title="Items" description={`${items.length} item(s)`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="py-2 pr-3 text-right font-medium">Qty</th>
                    <th className="py-2 pr-3 text-right font-medium">Rate</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="block font-medium">{it.item_name || it.item_code}</span>
                        {it.item_code && <span className="text-xs text-muted-foreground">{it.item_code}</span>}
                      </td>
                      <td className="py-2 pr-3 text-right">{it.qty} {it.uom}</td>
                      <td className="py-2 pr-3 text-right">{formatMoney(it.rate, si.currency)}</td>
                      <td className="py-2 text-right font-medium">{formatMoney(it.amount ?? lineAmount(it), si.currency)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No items on this sales invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <GLLedgerPanel voucherType="Sales Invoice" voucherNo={si.name ?? name} />
        </div>

        <div className="space-y-4">
          <SectionCard title="Connections" description="Documents linked to this Sales Invoice">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> Payment Entries
              {paymentEntries && paymentEntries.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {paymentEntries.length}
                </Badge>
              )}
            </p>
            {peError ? (
              <p className="mb-4 text-sm text-destructive">Failed to load payments: {humanizeError(peError)}</p>
            ) : (paymentEntries ?? []).length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">{peLoading ? "Loading…" : "No payments recorded yet."}</p>
            ) : (
              <ul className="mb-4 space-y-1">
                {(paymentEntries ?? []).map((pe) => (
                  <li key={pe.name}>
                    <Link
                      to={`/accounting/payment-entries/${encodeURIComponent(pe.name)}`}
                      className="flex items-center justify-between gap-1.5 text-sm text-primary hover:underline"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 opacity-60" /> {pe.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatMoney(pe.received_amount, si.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!salesOrder && !deliveryNote && (
              <p className="text-sm text-muted-foreground">Not linked to a Sales Order or Delivery Note.</p>
            )}
            {salesOrder && (
              <p className="mb-2">
                <Link to={`/selling/sales-orders/${encodeURIComponent(salesOrder)}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Handshake className="h-3.5 w-3.5 opacity-60" /> {salesOrder}
                </Link>
              </p>
            )}
            {deliveryNote && (
              <p>
                <Link to={`/selling/delivery-notes/${encodeURIComponent(deliveryNote)}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Package className="h-3.5 w-3.5 opacity-60" /> {deliveryNote}
                </Link>
              </p>
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${name}?`}
        description="This permanently removes the draft Sales Invoice."
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
