import { SimpleListPage } from "@/pages/common/SimpleListPage";

/** Export Packing Details (custom Apparel DocType). */
export function ExportPackingPage() {
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Export Packing Details"
      title="Export Packing"
      subtitle="Carton-wise packing lists for export orders"
      fields={["name", "packing_no", "packing_date", "sales_order", "customer", "total_cartons", "total_pieces", "docstatus"]}
      columns={[
        { key: "name", label: "Packing List", render: (r) => <span className="font-medium">{r.packing_no || r.name}</span> },
        { key: "sales_order", label: "Sales Order" },
        { key: "customer", label: "Buyer" },
        { key: "packing_date", label: "Date" },
        { key: "total_cartons", label: "Cartons", align: "right" },
        { key: "total_pieces", label: "Pieces", align: "right" },
      ]}
    />
  );
}
