import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";

interface DepartmentRow {
  name: string;
  department_name?: string;
  parent_department?: string;
  company?: string;
  is_group?: number;
  disabled?: number;
}

const columns: ColumnDef<DepartmentRow>[] = [
  { key: "parent_department", label: "Parent Department", getValue: (r) => r.parent_department },
  { key: "company", label: "Company", getValue: (r) => r.company },
  { key: "disabled", label: "Disabled", render: (r) => <span className="text-sm">{r.disabled ? "Yes" : "No"}</span> },
];

export default function DepartmentsPage() {
  const { company } = useCompanyContext();

  const config: CrmManagementConfig<DepartmentRow> = useMemo(
    () => ({
      title: "Departments",
      subtitle: "Organizational departments",
      icon: <Building2 className="h-5 w-5" />,
      doctype: "Department",
      fields: ["name", "department_name", "parent_department", "company", "is_group", "disabled"],
      filters: companyFilter(company),
      formFields: [
        { fieldname: "department_name", label: "Department Name", fieldtype: "Data", reqd: true },
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "parent_department", label: "Parent Department", fieldtype: "Link", options: "Department" },
        { fieldname: "is_group", label: "Is Group", fieldtype: "Check" },
        { fieldname: "disabled", label: "Disabled", fieldtype: "Check" },
      ],
      defaults: { company },
      kanbanField: "company",
      searchField: "department_name",
      statusField: "company",
      columns,
      rowName: (r) => r.department_name || r.name,
      rowSubtitle: (r) => r.parent_department,
      emptyTitle: "No departments",
      emptyDescription: "Add your first department",
      newLabel: "New Department",
    }),
    [company],
  );

  return <CrmManagementPage config={config} />;
}
