import { SimpleListPage } from "@/pages/common/SimpleListPage";

/** Payment Term master — reusable invoice payment schedules. */
export function PaymentTermsPage() {
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Payment Term"
      title="Payment Terms"
      subtitle="Reusable due-date and discount rules for invoice payment schedules"
      fields={["name", "payment_term_name", "invoice_portion", "due_date_based_on", "credit_days", "discount"]}
      sortBy="name"
      columns={[
        { key: "name", label: "Term", render: (r) => <span className="font-medium">{r.payment_term_name || r.name}</span> },
        { key: "invoice_portion", label: "Invoice %", align: "right", render: (r) => (r.invoice_portion != null ? `${r.invoice_portion}%` : "—") },
        { key: "due_date_based_on", label: "Due Date Based On" },
        { key: "credit_days", label: "Credit Days", align: "right" },
        { key: "discount", label: "Discount %", align: "right", render: (r) => (r.discount ? `${r.discount}%` : "—") },
      ]}
    />
  );
}
