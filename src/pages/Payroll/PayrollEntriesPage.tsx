import { useMemo } from "react";
import { PlayCircle, CheckCircle2, FileEdit } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate, todayISO } from "@/utils/dates";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";

interface PayrollEntryRow {
  name: string;
  company?: string;
  posting_date?: string;
  payroll_frequency?: string;
  start_date?: string;
  end_date?: string;
  department?: string;
  branch?: string;
  number_of_employees?: number;
  status?: string;
}

const STATUSES = ["Draft", "Submitted", "Cancelled", "Queued", "Failed"];

const columns: ColumnDef<PayrollEntryRow>[] = [
  { key: "start_date", label: "Period", render: (r) => <span className="text-sm">{formatDate(r.start_date)} – {formatDate(r.end_date)}</span> },
  { key: "payroll_frequency", label: "Frequency", getValue: (r) => r.payroll_frequency },
  { key: "number_of_employees", label: "Employees", align: "right", getValue: (r) => r.number_of_employees },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, getValue: (r) => r.status },
];

export default function PayrollEntriesPage() {
  const { company } = useCompanyContext();

  const config: CrmManagementConfig<PayrollEntryRow> = useMemo(
    () => ({
      title: "Payroll Entries",
      subtitle: "Payroll runs — create and process salary slips in bulk",
      icon: <PlayCircle className="h-5 w-5" />,
      doctype: "Payroll Entry",
      fields: ["name", "company", "posting_date", "payroll_frequency", "start_date", "end_date", "department", "branch", "number_of_employees", "status"],
      filters: companyFilter(company),
      formFields: [
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", reqd: true },
        { fieldname: "payroll_frequency", label: "Payroll Frequency", fieldtype: "Select", options: "\nMonthly\nFortnightly\nBimonthly\nWeekly\nDaily" },
        { fieldname: "start_date", label: "Start Date", fieldtype: "Date", reqd: true },
        { fieldname: "end_date", label: "End Date", fieldtype: "Date", reqd: true },
        { fieldname: "department", label: "Department", fieldtype: "Link", options: "Department" },
        { fieldname: "branch", label: "Branch", fieldtype: "Link", options: "Branch" },
      ],
      defaults: { company, posting_date: todayISO(), status: "Draft" },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "name",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      stats: (rows) => [
        { label: "Total", value: rows.length, icon: <PlayCircle className="h-4 w-4" />, tone: "sky" },
        { label: "Draft", value: rows.filter((r) => r.status === "Draft").length, icon: <FileEdit className="h-4 w-4" />, tone: "amber" },
        { label: "Submitted", value: rows.filter((r) => r.status === "Submitted").length, icon: <CheckCircle2 className="h-4 w-4" />, tone: "emerald" },
      ],
      rowName: (r) => r.name,
      rowSubtitle: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`,
      emptyTitle: "No payroll entries",
      emptyDescription: "Run payroll to see entries here",
      newLabel: "New Payroll Entry",
    }),
    [company],
  );

  return <CrmManagementPage config={config} />;
}
