import { useParams, Link } from "react-router-dom";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { ArrowLeft, FileText, Ship, ExternalLink, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusTimeline, StatusTimelineCompact } from "@/components/common/status-timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useExportShipment, EXPORT_SHIPMENT_FLOW, shipmentStatusIndex } from "@/hooks/useExportShipments";
import { formatDate } from "@/utils/dates";
import type { ExportShipment } from "@/types/frappe";

interface FrappeFile {
  name: string;
  file_name: string;
  file_url: string;
  file_size?: number;
}

export function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value == null || value === "" ? "—" : value}</span>
    </div>
  );
}

/** Export Shipment detail: header, lifecycle timeline, and shipment documents. */
export function ExportShipmentDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { data: shipment, error, isLoading, mutate } = useExportShipment(name);

  // Attachments via the standard Frappe File doctype.
  const { data: files } = useFrappeGetDocList<FrappeFile>("File", {
    fields: ["name", "file_name", "file_url", "file_size"],
    filters: [["attached_to_doctype", "=", "Export Shipment"], ["attached_to_name", "=", name ?? ""]],
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="space-y-4">
        <PageHeader title="Export Shipment" />
        <SectionCard>
          <p className="text-sm text-destructive">Failed to load shipment {name}.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void mutate()}>
            Retry
          </Button>
        </SectionCard>
      </div>
    );
  }

  const doc = shipment as ExportShipment;
  const statusIdx = shipmentStatusIndex(doc.shipment_status ?? doc.workflow_state);

  const documents: { label: string; no?: string | null }[] = [
    { label: "Commercial Invoice", no: doc.commercial_invoice_no },
    { label: "Packing List", no: doc.packing_list_no },
    { label: "Bill of Lading", no: doc.bill_of_lading_no },
    { label: "LC Proforma", no: doc.lc_proforma },
    { label: "Certificate of Origin", no: null },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={doc.shipment_no || doc.name || name!}
        subtitle="Export Shipment"
        icon={<Ship className="h-5 w-5" />}
        breadcrumbs={
          <Link to="/export/shipments" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Export Shipments
          </Link>
        }
        actions={<StatusBadge status={doc.shipment_status || "Draft"} />}
      />

      {/* Mobile compact timeline */}
      <div className="lg:hidden">
        <StatusTimelineCompact steps={EXPORT_SHIPMENT_FLOW} currentIndex={statusIdx} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Shipment Details">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Row label="Buyer" value={doc.customer} />
              <Row label="Sales Order" value={doc.sales_order} />
              <Row label="LC No." value={doc.lc_no} />
              <Row label="Container" value={doc.container_no} />
              <Row label="Vessel" value={doc.vessel} />
              <Row label="Shipping Line" value={doc.shipping_line} />
              <Row label="Port of Loading" value={doc.port_of_loading} />
              <Row label="Port of Discharge" value={doc.port_of_discharge} />
              <Row label="Final Destination" value={doc.final_destination} />
              <Row label="Shipment Date" value={formatDate(doc.shipment_date)} />
            </div>
          </SectionCard>

          <SectionCard title="Schedule">
            <div className="grid gap-x-8 sm:grid-cols-3">
              <Row label="ETD" value={formatDate(doc.etd)} />
              <Row label="ETA" value={formatDate(doc.eta)} />
              <Row label="Actual Shipment" value={formatDate(doc.actual_shipment_date)} />
            </div>
          </SectionCard>

          <SectionCard title="Documents" description="Linked document references and attachments">
            <div className="grid gap-x-8 sm:grid-cols-2">
              {documents.map((d) => (
                <Row key={d.label} label={d.label} value={d.no ?? "—"} />
              ))}
            </div>
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" /> Attachments
              </p>
              {(files ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No files attached in ERPNext.</p>
              ) : (
                <ul className="space-y-1">
                  {(files ?? []).map((f) => (
                    <li key={f.name}>
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> {f.file_name}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Desktop vertical timeline */}
        <div className="hidden lg:block">
          <SectionCard title="Shipment Progress">
            <StatusTimeline steps={EXPORT_SHIPMENT_FLOW} currentIndex={statusIdx} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

