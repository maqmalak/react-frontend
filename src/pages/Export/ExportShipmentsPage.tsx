import { SimpleListPage } from "@/pages/common/SimpleListPage";
import { StatusBadge } from "@/components/common/status-badge";
import { useNavigate } from "react-router-dom";

/** Export Shipments (custom Micromax DocType). */
export function ExportShipmentsPage() {
  const navigate = useNavigate();
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Export Shipment"
      title="Export Shipments"
      subtitle="Outbound container shipments"
      fields={["name", "customer", "sales_order", "container_no", "vessel", "etd", "eta", "shipment_status", "docstatus"]}
      columns={[
        { key: "name", label: "Shipment", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "customer", label: "Buyer" },
        { key: "sales_order", label: "Sales Order" },
        { key: "container_no", label: "Container", render: (r) => r.container_no || "—" },
        { key: "vessel", label: "Vessel", render: (r) => r.vessel || "—" },
        { key: "etd", label: "ETD" },
        { key: "eta", label: "ETA" },
        {
          key: "shipment_status",
          label: "Status",
          render: (r) => <StatusBadge status={r.shipment_status || "Draft"} />,
        },
      ]}
      onRowClick={(r) => navigate(`/export/shipments/${encodeURIComponent(r.name)}`)}
    />
  );
}
