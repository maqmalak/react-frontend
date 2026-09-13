import { useState, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Package, Pencil, Trash2, FileText, FilePlus, RefreshCw, Handshake } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryNote, useDeliveryNoteMutations } from "@/hooks/useDeliveryNotes";
import { useSalesInvoicesForDN } from "@/hooks/useSalesInvoices";
import { useAuth } from "@/hooks/useAuth";
import { notifyDataChanged, DATA_CHANGED_EVENT } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { makeSalesInvoiceFromDN } from "@/services/api";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import type { DeliveryNote, DeliveryNoteItem } from "@/types/frappe";

function lineAmount(row: Pick<DeliveryNoteItem, "qty" | "rate">): number {
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

/** Delivery Note view page — mirrors `PurchaseOrderDetailPage`/`SalesOrderDetailPage`. */
export function DeliveryNoteDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole();

  const { data: doc, error, isLoading, mutate } = useDeliveryNote(name);
  const { deleteDoc, loading: deleteLoading } = useDeliveryNoteMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [creatingSI, setCreatingSI] = useState(false);

  const {
    data: salesInvoices,
    isLoading: siLoading,
    error: siError,
    mutate: refreshSIs,
  } = useSalesInvoicesForDN(name);

  const refreshConnections = useCallback(() => {
    void refreshSIs();
  }, [refreshSIs]);

  useEffect(() => {
    refreshConnections();
    const handler = () => refreshConnections();
    window.addEventListener(DATA_CHANGED_EVENT, handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handler);
      window.removeEventListener("focus", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshConnections, name]);

  const handleDelete = async () => {
    if (!name) return;
    try {
      await deleteDoc(name);
      toast.success("Delivery Note deleted");
      notifyDataChanged();
      navigate("/selling/delivery-notes");
    } catch (err) {
      toast.error(humanizeError(err));
      setConfirmDelete(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!name) return;
    setCreatingSI(true);
    try {
      const mapped = await makeSalesInvoiceFromDN(name);
      navigate("/selling/sales-invoices/new", { state: { prefill: mapped } });
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setCreatingSI(false);
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
        <PageHeader title="Delivery Note" />
        <SectionCard>
          <p className="text-sm text-destructive">Failed to load delivery note {name}.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void mutate()}>
            Retry
          </Button>
        </SectionCard>
      </div>
    );
  }

  const dn = doc as DeliveryNote;
  const items = dn.items ?? [];
  const totalQty = items.reduce((s, it) => s + Number(it.qty || 0), 0);
  const editable = canWrite && (dn.docstatus ?? 0) === 0;
  const salesOrder = items.find((it) => it.against_sales_order)?.against_sales_order;

  const statusLabel = dn.status || (dn.docstatus === 1 ? "Submitted" : dn.docstatus === 2 ? "Cancelled" : "Draft");

  return (
    <div className="space-y-6">
      <PageHeader
        title={dn.name || name!}
        subtitle="Delivery Note"
        icon={<Package className="h-5 w-5" />}
        breadcrumbs={
          <Link to="/selling/delivery-notes" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Delivery Notes
          </Link>
        }
        actions={
          <>
            <StatusBadge status={statusLabel} />
            {dn.docstatus === 1 && (dn.per_billed ?? 0) < 100 && (
              <Button size="sm" variant="outline" onClick={() => void handleCreateInvoice()} disabled={creatingSI}>
                <FilePlus className="h-4 w-4" /> Create Sales Invoice
              </Button>
            )}
            {editable && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(`/selling/delivery-notes/${encodeURIComponent(name!)}/edit`)}>
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
          <p className="font-medium">{dn.customer_name || dn.customer || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Currency</p>
          <p className="font-medium">{dn.currency || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-bold">{formatMoney(dn.grand_total ?? dn.net_total, dn.currency)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Delivery Details">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Row label="Customer" value={dn.customer_name || dn.customer} />
              <Row label="Company" value={dn.company} />
              <Row label="Posting Date" value={formatDate(dn.posting_date)} />
              <Row label="Currency" value={dn.currency} />
              <Row label="Conversion Rate" value={dn.conversion_rate ?? 1} />
              <Row label="Total Qty" value={totalQty} />
              <Row label="Net Total" value={dn.net_total != null ? formatMoney(dn.net_total, dn.currency) : undefined} />
              <Row label="Grand Total" value={dn.grand_total != null ? formatMoney(dn.grand_total, dn.currency) : undefined} />
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
                      <td className="py-2 pr-3 text-right">{formatMoney(it.rate, dn.currency)}</td>
                      <td className="py-2 text-right font-medium">{formatMoney(it.amount ?? lineAmount(it), dn.currency)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No items on this delivery note.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Connections"
            description="Documents linked to this Delivery Note"
            actions={
              <Button size="sm" variant="outline" onClick={refreshConnections} disabled={siLoading}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            }
          >
            {salesOrder && (
              <>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Handshake className="h-3.5 w-3.5" /> Sales Order
                </p>
                <ul className="mb-4 space-y-1">
                  <li>
                    <Link to={`/selling/sales-orders/${encodeURIComponent(salesOrder)}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Handshake className="h-3.5 w-3.5 opacity-60" /> {salesOrder}
                    </Link>
                  </li>
                </ul>
              </>
            )}

            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Sales Invoices
              {(!siLoading && salesInvoices && salesInvoices.length > 0) && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {salesInvoices.length}
                </Badge>
              )}
            </p>
            {siError ? (
              <p className="text-sm text-destructive">Failed to load sales invoices: {humanizeError(siError)}</p>
            ) : (salesInvoices ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{siLoading ? "Loading…" : "No linked sales invoices."}</p>
            ) : (
              <ul className="space-y-1">
                {(salesInvoices ?? []).map((inv) => (
                  <li key={inv.name}>
                    <Link to={`/selling/sales-invoices/${encodeURIComponent(inv.name ?? "")}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <FileText className="h-3.5 w-3.5 opacity-60" /> {inv.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${name}?`}
        description="This permanently removes the draft Delivery Note."
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
