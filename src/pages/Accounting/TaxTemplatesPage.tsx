import { SimpleListPage } from "@/pages/common/SimpleListPage";
import { Badge } from "@/components/ui/badge";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";

/** Sales or Purchase Taxes and Charges Template list — same shape, different doctype. */
export function TaxTemplatesPage({
  doctype,
  title,
  subtitle,
}: {
  doctype: "Sales Taxes and Charges Template" | "Purchase Taxes and Charges Template";
  title: string;
  subtitle: string;
}) {
  const { company } = useCompanyContext();
  return (
    <SimpleListPage<Record<string, any>>
      doctype={doctype}
      title={title}
      subtitle={subtitle}
      fields={["name", "title", "company", "is_default", "disabled"]}
      filters={companyFilter(company)}
      sortBy="modified"
      columns={[
        { key: "title", label: "Template", render: (r) => <span className="font-medium">{r.title || r.name}</span> },
        { key: "company", label: "Company" },
        { key: "is_default", label: "Default", render: (r) => (r.is_default ? <Badge variant="primary">Default</Badge> : null) },
        { key: "disabled", label: "Status", render: (r) => (r.disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="success">Active</Badge>) },
      ]}
    />
  );
}
