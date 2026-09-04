import { SimpleListPage } from "@/pages/common/SimpleListPage";
import { Badge } from "@/components/ui/badge";

/** Mode of Payment master (Cash, Bank Draft, Wire Transfer, ...). */
export function ModeOfPaymentPage() {
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Mode of Payment"
      title="Mode of Payment"
      subtitle="Cash, bank and card payment channels used across invoices and entries"
      fields={["name", "type", "enabled"]}
      sortBy="name"
      columns={[
        { key: "name", label: "Mode of Payment", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", label: "Type" },
        { key: "enabled", label: "Status", render: (r) => (r.enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="destructive">Disabled</Badge>) },
      ]}
    />
  );
}
