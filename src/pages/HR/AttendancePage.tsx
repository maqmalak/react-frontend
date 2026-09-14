import { useMemo } from "react";
import { CalendarCheck, UserCheck, UserX, CalendarClock } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate, todayISO } from "@/utils/dates";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { useEmployeeQueryFilter } from "@/hooks/useEmployeeQueryFilter";

interface AttendanceRow {
  name: string;
  employee?: string;
  employee_name?: string;
  attendance_date?: string;
  status?: string;
  leave_type?: string;
  company?: string;
  department?: string;
  shift?: string;
}

const STATUSES = ["Present", "Absent", "On Leave", "Half Day", "Work From Home"];

const columns: ColumnDef<AttendanceRow>[] = [
  { key: "employee", label: "Employee ID", getValue: (r) => r.employee },
  { key: "attendance_date", label: "Date", render: (r) => <span className="text-sm">{formatDate(r.attendance_date)}</span> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, getValue: (r) => r.status },
  { key: "department", label: "Department", getValue: (r) => r.department },
];

export default function AttendancePage() {
  const { company } = useCompanyContext();
  const { employee, filter: employeeFilter } = useEmployeeQueryFilter();

  const config: CrmManagementConfig<AttendanceRow> = useMemo(
    () => ({
      title: "Attendance",
      subtitle: "Daily attendance records per employee",
      icon: <CalendarCheck className="h-5 w-5" />,
      doctype: "Attendance",
      fields: ["name", "employee", "employee_name", "attendance_date", "status", "leave_type", "company", "department", "shift"],
      filters: [...companyFilter(company), ...employeeFilter],
      formFields: [
        { fieldname: "employee", label: "Employee", fieldtype: "Link", options: "Employee", reqd: true },
        { fieldname: "attendance_date", label: "Attendance Date", fieldtype: "Date", reqd: true },
        { fieldname: "status", label: "Status", fieldtype: "Select", options: STATUSES.join("\n"), reqd: true },
        { fieldname: "leave_type", label: "Leave Type (if On Leave)", fieldtype: "Link", options: "Leave Type" },
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "department", label: "Department", fieldtype: "Link", options: "Department" },
        { fieldname: "shift", label: "Shift", fieldtype: "Link", options: "Shift Type" },
      ],
      defaults: { company, attendance_date: todayISO(), status: "Present", employee: employee ?? undefined },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "employee_name",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      stats: (rows) => [
        { label: "Total", value: rows.length, icon: <CalendarCheck className="h-4 w-4" />, tone: "sky" },
        { label: "Present", value: rows.filter((r) => r.status === "Present").length, icon: <UserCheck className="h-4 w-4" />, tone: "emerald" },
        { label: "Absent", value: rows.filter((r) => r.status === "Absent").length, icon: <UserX className="h-4 w-4" />, tone: "rose" },
        { label: "On Leave", value: rows.filter((r) => r.status === "On Leave").length, icon: <CalendarClock className="h-4 w-4" />, tone: "amber" },
      ],
      rowName: (r) => r.employee_name || r.employee || r.name,
      rowSubtitle: (r) => formatDate(r.attendance_date),
      emptyTitle: "No attendance records",
      emptyDescription: "Mark attendance to see it here",
      newLabel: "Mark Attendance",
    }),
    [company, employee],
  );

  return <CrmManagementPage config={config} />;
}
