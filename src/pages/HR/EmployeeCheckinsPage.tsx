import { useMemo } from "react";
import { LogIn } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime, nowERPDateTime } from "@/utils/dates";
import { useEmployeeQueryFilter } from "@/hooks/useEmployeeQueryFilter";

interface CheckinRow {
  name: string;
  employee?: string;
  employee_name?: string;
  log_type?: string;
  time?: string;
  shift?: string;
  device_id?: string;
}

const columns: ColumnDef<CheckinRow>[] = [
  { key: "log_type", label: "Type", render: (r) => <StatusBadge status={r.log_type} />, getValue: (r) => r.log_type },
  { key: "time", label: "Time", render: (r) => <span className="text-sm">{formatDateTime(r.time)}</span> },
  { key: "device_id", label: "Device", getValue: (r) => r.device_id },
];

export default function EmployeeCheckinsPage() {
  const { employee, filter: employeeFilter } = useEmployeeQueryFilter();

  const config: CrmManagementConfig<CheckinRow> = useMemo(
    () => ({
      title: "Employee Checkins",
      subtitle: "Biometric / manual clock in and clock out log",
      icon: <LogIn className="h-5 w-5" />,
      doctype: "Employee Checkin",
      fields: ["name", "employee", "employee_name", "log_type", "time", "shift", "device_id"],
      filters: employeeFilter,
      formFields: [
        { fieldname: "employee", label: "Employee", fieldtype: "Link", options: "Employee", reqd: true },
        { fieldname: "log_type", label: "Log Type", fieldtype: "Select", options: "\nIN\nOUT" },
        { fieldname: "time", label: "Time", fieldtype: "Datetime", reqd: true },
        { fieldname: "shift", label: "Shift", fieldtype: "Link", options: "Shift Type" },
        { fieldname: "device_id", label: "Location / Device ID", fieldtype: "Data" },
      ],
      defaults: { time: nowERPDateTime(), employee: employee ?? undefined },
      kanbanField: "log_type",
      searchField: "employee_name",
      statusField: "log_type",
      statusOptions: ["IN", "OUT"],
      columns,
      rowName: (r) => r.employee_name || r.employee || r.name,
      rowSubtitle: (r) => formatDateTime(r.time),
      emptyTitle: "No checkins",
      emptyDescription: "Checkin records will appear here",
      newLabel: "New Checkin",
    }),
    [employee],
  );

  return <CrmManagementPage config={config} />;
}
