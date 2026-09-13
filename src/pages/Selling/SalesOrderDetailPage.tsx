import { useState, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Handshake, Pencil, Trash2, Package, FileText, FilePlus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesOrder, useSalesOrderMutations } from "@/hooks/useSalesOrders";
import { useDeliveryNotesForSO } from "@/hooks/useDeliveryNotes";
import { useSalesInvoicesForSO } from "@/hooks/useSalesInvoices";
import { useAuth } from "@/hooks/useAuth";
import { notifyDataChanged, DATA_CHANGED_EVENT } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { makeDeliveryNoteFromSO, makeSalesInvoiceFromSO } from "@/services/api";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import type { SalesOrder, SalesOrderItem } from "@/types/frappe";

function lineAmount(row: Pick<SalesOrderItem, "qty" | "rate">): number {
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

/**
 * Sales Order view page.
 *
 * Read-only presentation of a Sales Order (the same doctype the Export
 * Orders list reads) with an explicit Edit action and a Connections panel
 * listing linked Delivery Notes / Sales Invoices, mirroring
 * `PurchaseOrderDetailPage`.
 */
export function SalesOrderDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole();

  const { data: doc, error, isLoading, mutate } = useSalesOrder(name);
  const { deleteDoc, loading: deleteLoading } = useSalesOrderMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [creatingDN, setCreatingDN] = useState(false);
  const [creatingSI, setCreatingSI] = useState(false);

  const {
    data: deliveryNotes,
    isLoading: dnLoading,
    error: dnError,
    mutate: refreshDNs,
  } = useDeliveryNotesForSO(name);
  const {
    data: salesInvoices,
    isLoading: siLoading,
    error: siError,
    mutate: refreshSIs,
  } = useSalesInvoicesForSO(name);

  const refreshConnections = useCallback(() => {
    void refreshDNs();
    void refreshSIs();
  }, [refreshDNs, refreshSIs]);

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
      toast.success("Sales Order deleted");
      notifyDataChanged();
      navigate("/selling/sales-orders");
    } catch (err) {
      toast.error(humanizeError(err));
      setConfirmDelete(false);
    }
  };

  const handleCreateDeliveryNote = async () => {
    if (!name) return;
    setCreatingDN(true);
    try {
      const mapped = await makeDeliveryNoteFromSO(name);
      navigate("/selling/delivery-notes/new", { state: { prefill: mapped } });
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setCreatingDN(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!name) return;
    setCreatingSI(true);
    try {
      const mapped = await makeSalesInvoiceFromSO(name);
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
        <PageHeader title="Sales Order" />
        <SectionCard>
          <p className="text-sm text-destructive">Failed to load sales order {name}.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void mutate()}>
            Retry
          </Button>
        </SectionCard>
      </div>
    );
  }

  const so = doc as SalesOrder;
  const items = so.items ?? [];
  const totalQty = items.reduce((s, it) => s + Number(it.qty || 0), 0);
  const editable = canWrite && (so.docstatus ?? 0) === 0;

  const statusLabel = so.status || (so.docstatus === 1 ? "Submitted" : so.docstatus === 2 ? "Cancelled" : "Draft");

  return (
    <div className="space-y-6">
      <PageHeader
        title={so.name || name!}
        subtitle="Sales Order"
        icon={<Handshake className="h-5 w-5" />}
        breadcrumbs={
          <Link to="/selling/sales-orders" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Sales Orders
          </Link>
        }
        actions={
          <>
            <StatusBadge status={statusLabel} />
            {so.docstatus === 1 && (so.per_delivered ?? 0) < 100 && (
              <Button size="sm" variant="outline" onClick={() => void handleCreateDeliveryNote()} disabled={creatingDN}>
                <FilePlus className="h-4 w-4" /> Create Delivery Note
              </Button>
            )}
            {so.docstatus === 1 && (so.per_billed ?? 0) < 100 && (
              <Button size="sm" variant="outline" onClick={() => void handleCreateInvoice()} disabled={creatingSI}>
                <FilePlus className="h-4 w-4" /> Create Sales Invoice
              </Button>
            )}
            {editable && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(`/selling/sales-orders/${encodeURIComponent(name!)}/edit`)}>
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
          <p className="font-medium">{so.customer_name || so.customer || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Currency</p>
          <p className="font-medium">{so.currency || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-bold">{formatMoney(so.grand_total ?? so.net_total, so.currency)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Order Details">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Row label="Customer" value={so.customer_name || so.customer} />
              <Row label="Company" value={so.company} />
              <Row label="Transaction Date" value={formatDate(so.transaction_date)} />
              <Row label="Delivery Date" value={formatDate(so.delivery_date)} />
              <Row label="Currency" value={so.currency} />
              <Row label="Conversion Rate" value={so.conversion_rate ?? 1} />
              <Row label="Customer's PO No" value={so.po_no} />
              <Row label="Buyer PO No." value={so.buyer_po_no} />
              <Row label="Export Status" value={so.export_status} />
              <Row label="LC Proforma" value={so.lc_proforma} />
              <Row label="LC No." value={so.lc_no} />
              <Row label="Incoterm" value={so.incoterm} />
              <Row label="Shipment Mode" value={so.shipment_mode} />
              <Row label="Country of Destination" value={so.country_of_destination} />
              <Row label="Total Qty" value={totalQty} />
              <Row label="Net Total" value={so.net_total != null ? formatMoney(so.net_total, so.currency) : undefined} />
              <Row label="Grand Total" value={so.grand_total != null ? formatMoney(so.grand_total, so.currency) : undefined} />
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
                      <td className="py-2 pr-3 text-right">{formatMoney(it.rate, so.currency)}</td>
                      <td className="py-2 text-right font-medium">{formatMoney(it.amount ?? lineAmount(it), so.currency)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No items on this sales order.
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
            description="Documents linked to this Sales Order"
            actions={
              <Button size="sm" variant="outline" onClick={refreshConnections} disabled={dnLoading || siLoading}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            }
          >
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Delivery Notes
              {(!dnLoading && deliveryNotes && deliveryNotes.length > 0) && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {deliveryNotes.length}
                </Badge>
              )}
            </p>
            {dnError ? (
              <p className="mb-4 text-sm text-destructive">Failed to load delivery notes: {humanizeError(dnError)}</p>
            ) : (deliveryNotes ?? []).length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">{dnLoading ? "Loading…" : "No linked delivery notes."}</p>
            ) : (
              <ul className="mb-4 space-y-1">
                {(deliveryNotes ?? []).map((d) => (
                  <li key={d.name}>
                    <Link to={`/selling/delivery-notes/${encodeURIComponent(d.name ?? "")}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Package className="h-3.5 w-3.5 opacity-60" /> {d.name}
                      {d.posting_date ? <span className="text-xs text-muted-foreground"> · {formatDate(d.posting_date)}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
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
        description="This permanently removes the draft Sales Order."
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
