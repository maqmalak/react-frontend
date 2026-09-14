import { useMemo } from "react";
import { CalendarOff, CheckCircle2, XCircle, Clock } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate, todayISO } from "@/utils/dates";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { useEmployeeQueryFilter } from "@/hooks/useEmployeeQueryFilter";

interface LeaveApplicationRow {
  name: string;
  employee?: string;
  employee_name?: string;
  leave_type?: string;
  company?: string;
  department?: string;
  from_date?: string;
  to_date?: string;
  total_leave_days?: number;
  description?: string;
  status?: string;
  posting_date?: string;
}

const STATUSES = ["Open", "Approved", "Rejected", "Cancelled"];

const columns: ColumnDef<LeaveApplicationRow>[] = [
  { key: "leave_type", label: "Leave Type", getValue: (r) => r.leave_type },
  { key: "from_date", label: "From", render: (r) => <span className="text-sm">{formatDate(r.from_date)}</span> },
  { key: "to_date", label: "To", render: (r) => <span className="text-sm">{formatDate(r.to_date)}</span> },
  { key: "total_leave_days", label: "Days", align: "right", getValue: (r) => r.total_leave_days },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, getValue: (r) => r.status },
];

export default function LeaveApplicationsPage() {
  const { company } = useCompanyContext();
  const { employee, filter: employeeFilter } = useEmployeeQueryFilter();

  const config: CrmManagementConfig<LeaveApplicationRow> = useMemo(
    () => ({
      title: "Leave Applications",
      subtitle: "Employee leave requests and approvals",
      icon: <CalendarOff className="h-5 w-5" />,
      doctype: "Leave Application",
      fields: [
        "name", "employee", "employee_name", "leave_type", "company", "department",
        "from_date", "to_date", "total_leave_days", "description", "status", "posting_date",
      ],
      filters: [...companyFilter(company), ...employeeFilter],
      formFields: [
        { fieldname: "employee", label: "Employee", fieldtype: "Link", options: "Employee", reqd: true },
        { fieldname: "leave_type", label: "Leave Type", fieldtype: "Link", options: "Leave Type", reqd: true },
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "from_date", label: "From Date", fieldtype: "Date", reqd: true },
        { fieldname: "to_date", label: "To Date", fieldtype: "Date", reqd: true },
        { fieldname: "description", label: "Reason", fieldtype: "Text" },
        { fieldname: "status", label: "Status", fieldtype: "Select", options: STATUSES.join("\n"), default: "Open" },
        { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", reqd: true },
      ],
      defaults: { company, status: "Open", posting_date: todayISO(), employee: employee ?? undefined },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "employee_name",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      stats: (rows) => [
        { label: "Total", value: rows.length, icon: <CalendarOff className="h-4 w-4" />, tone: "sky" },
        { label: "Open", value: rows.filter((r) => r.status === "Open").length, icon: <Clock className="h-4 w-4" />, tone: "amber" },
        { label: "Approved", value: rows.filter((r) => r.status === "Approved").length, icon: <CheckCircle2 className="h-4 w-4" />, tone: "emerald" },
        { label: "Rejected", value: rows.filter((r) => r.status === "Rejected").length, icon: <XCircle className="h-4 w-4" />, tone: "rose" },
      ],
      rowName: (r) => r.employee_name || r.employee || r.name,
      rowSubtitle: (r) => `${r.leave_type ?? ""} · ${formatDate(r.from_date)} – ${formatDate(r.to_date)}`,
      emptyTitle: "No leave applications",
      emptyDescription: "Leave requests will appear here",
      newLabel: "New Leave Application",
    }),
    [company, employee],
  );

  return <CrmManagementPage config={config} />;
}
