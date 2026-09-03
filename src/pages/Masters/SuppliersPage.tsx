import { SimpleListPage } from "@/pages/common/SimpleListPage";

/** Supplier master (standard ERPNext Supplier DocType). */
export function SuppliersPage() {
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Supplier"
      title="Suppliers"
      subtitle="Vendors from the ERPNext Supplier master"
      fields={["name", "supplier_name", "supplier_group", "country", "disabled"]}
      columns={[
        { key: "name", label: "Supplier", render: (r) => <span className="font-medium">{r.supplier_name || r.name}</span> },
        { key: "supplier_group", label: "Group" },
        { key: "country", label: "Country" },
      ]}
    />
  );
}
