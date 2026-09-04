import { SimpleListPage } from "@/pages/common/SimpleListPage";
import { Badge } from "@/components/ui/badge";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";

/** Cost Center master (standard ERPNext Cost Center DocType). */
export function CostCentersPage() {
  const { company } = useCompanyContext();
  return (
    <SimpleListPage<Record<string, any>>
      doctype="Cost Center"
      title="Cost Centers"
      subtitle="Track income and expense by department, project or division"
      fields={["name", "cost_center_name", "parent_cost_center", "is_group", "disabled"]}
      filters={companyFilter(company)}
      sortBy="name"
      columns={[
        { key: "name", label: "Cost Center", render: (r) => <span className="font-medium">{r.cost_center_name || r.name}</span> },
        { key: "parent_cost_center", label: "Parent" },
        { key: "is_group", label: "Type", render: (r) => (r.is_group ? <Badge variant="secondary">Group</Badge> : <Badge variant="outline">Leaf</Badge>) },
        { key: "disabled", label: "Status", render: (r) => (r.disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="success">Active</Badge>) },
      ]}
    />
  );
}
