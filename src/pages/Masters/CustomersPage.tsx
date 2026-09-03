import { SimpleListPage } from "@/pages/common/SimpleListPage";

/** Customer master (standard ERPNext Customer DocType). */
export function CustomersPage() {
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Customer"
      title="Customers"
      subtitle="Buyers / customers from the ERPNext Customer master"
      fields={["name", "customer_name", "customer_group", "territory", "disabled"]}
      columns={[
        { key: "name", label: "Customer", render: (r) => <span className="font-medium">{r.customer_name || r.name}</span> },
        { key: "customer_group", label: "Group" },
        { key: "territory", label: "Territory" },
      ]}
    />
  );
}
