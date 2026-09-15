import { useMemo } from "react";
import { Clock3 } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate, todayISO } from "@/utils/dates";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { useEmployeeQueryFilter } from "@/hooks/useEmployeeQueryFilter";

interface ShiftAssignmentRow {
  name: string;
  employee?: string;
  employee_name?: string;
  company?: string;
  department?: string;
  shift_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

const STATUSES = ["Active", "Inactive"];

const columns: ColumnDef<ShiftAssignmentRow>[] = [
  { key: "shift_type", label: "Shift", getValue: (r) => r.shift_type },
  { key: "start_date", label: "Start", render: (r) => <span className="text-sm">{formatDate(r.start_date)}</span> },
  { key: "end_date", label: "End", render: (r) => <span className="text-sm">{formatDate(r.end_date)}</span> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, getValue: (r) => r.status },
];

export default function ShiftAssignmentsPage() {
  const { company } = useCompanyContext();
  const { employee, filter: employeeFilter } = useEmployeeQueryFilter();

  const config: CrmManagementConfig<ShiftAssignmentRow> = useMemo(
    () => ({
      title: "Shift Assignments",
      subtitle: "Employee shift schedules",
      icon: <Clock3 className="h-5 w-5" />,
      doctype: "Shift Assignment",
      fields: ["name", "employee", "employee_name", "company", "department", "shift_type", "status", "start_date", "end_date"],
      filters: [...companyFilter(company), ...employeeFilter],
      formFields: [
        { fieldname: "employee", label: "Employee", fieldtype: "Link", options: "Employee", reqd: true },
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "shift_type", label: "Shift Type", fieldtype: "Link", options: "Shift Type", reqd: true },
        { fieldname: "start_date", label: "Start Date", fieldtype: "Date", reqd: true },
        { fieldname: "end_date", label: "End Date", fieldtype: "Date" },
        { fieldname: "status", label: "Status", fieldtype: "Select", options: STATUSES.join("\n"), default: "Active" },
      ],
      defaults: { company, status: "Active", start_date: todayISO(), employee: employee ?? undefined },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "employee_name",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      rowName: (r) => r.employee_name || r.employee || r.name,
      rowSubtitle: (r) => r.shift_type,
      emptyTitle: "No shift assignments",
      emptyDescription: "Shift assignments will appear here",
      newLabel: "New Shift Assignment",
    }),
    [company, employee],
  );

  return <CrmManagementPage config={config} />;
}
