import { SimpleListPage } from "@/pages/common/SimpleListPage";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/dates";

/** Fiscal Year master (standard ERPNext Fiscal Year DocType). */
export function FiscalYearsPage() {
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Fiscal Year"
      title="Fiscal Years"
      subtitle="Accounting periods used across all financial reports"
      fields={["name", "year_start_date", "year_end_date", "disabled"]}
      sortBy="year_start_date"
      columns={[
        { key: "name", label: "Fiscal Year", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "year_start_date", label: "Start Date", render: (r) => formatDate(r.year_start_date) },
        { key: "year_end_date", label: "End Date", render: (r) => formatDate(r.year_end_date) },
        { key: "disabled", label: "Status", render: (r) => (r.disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="success">Active</Badge>) },
      ]}
    />
  );
}
