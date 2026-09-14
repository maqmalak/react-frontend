import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CheckCircle2, FileEdit } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatMoney } from "@/utils/currency";
import { formatDate, todayISO } from "@/utils/dates";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";

interface SalarySlipRow {
  name: string;
  employee?: string;
  employee_name?: string;
  company?: string;
  department?: string;
  posting_date?: string;
  start_date?: string;
  end_date?: string;
  salary_structure?: string;
  currency?: string;
  gross_pay?: number;
  net_pay?: number;
  status?: string;
}

const STATUSES = ["Draft", "Submitted", "Cancelled", "Withheld"];

const columns: ColumnDef<SalarySlipRow>[] = [
  { key: "start_date", label: "Period", render: (r) => <span className="text-sm">{formatDate(r.start_date)} – {formatDate(r.end_date)}</span> },
  { key: "gross_pay", label: "Gross Pay", align: "right", render: (r) => <span className="text-sm">{formatMoney(r.gross_pay, r.currency)}</span> },
  { key: "net_pay", label: "Net Pay", align: "right", render: (r) => <span className="text-sm font-medium">{formatMoney(r.net_pay, r.currency)}</span> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, getValue: (r) => r.status },
];

export default function SalarySlipsPage() {
  const { company } = useCompanyContext();
  const navigate = useNavigate();

  const config: CrmManagementConfig<SalarySlipRow> = useMemo(
    () => ({
      title: "Salary Slips",
      subtitle: "Per-employee, per-period pay slips",
      icon: <Banknote className="h-5 w-5" />,
      doctype: "Salary Slip",
      fields: [
        "name", "employee", "employee_name", "company", "department", "posting_date", "start_date", "end_date",
        "salary_structure", "currency", "gross_pay", "net_pay", "status",
      ],
      filters: companyFilter(company),
      formFields: [
        { fieldname: "employee", label: "Employee", fieldtype: "Link", options: "Employee", reqd: true },
        { fieldname: "salary_structure", label: "Salary Structure", fieldtype: "Link", options: "Salary Structure", reqd: true },
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "currency", label: "Currency", fieldtype: "Link", options: "Currency", reqd: true },
        { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", reqd: true },
        { fieldname: "start_date", label: "Start Date", fieldtype: "Date" },
        { fieldname: "end_date", label: "End Date", fieldtype: "Date" },
      ],
      defaults: { company, posting_date: todayISO(), status: "Draft" },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "employee_name",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      stats: (rows) => [
        { label: "Total", value: rows.length, icon: <Banknote className="h-4 w-4" />, tone: "sky" },
        { label: "Draft", value: rows.filter((r) => r.status === "Draft").length, icon: <FileEdit className="h-4 w-4" />, tone: "amber" },
        { label: "Submitted", value: rows.filter((r) => r.status === "Submitted").length, icon: <CheckCircle2 className="h-4 w-4" />, tone: "emerald" },
        {
          label: "Net Pay Total",
          value: formatMoney(rows.filter((r) => r.status !== "Cancelled").reduce((s, r) => s + (r.net_pay ?? 0), 0)),
          icon: <Banknote className="h-4 w-4" />,
          tone: "indigo",
        },
      ],
      rowName: (r) => r.employee_name || r.employee || r.name,
      rowSubtitle: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`,
      onOpen: (r) => navigate(`/payroll/salary-slips/${encodeURIComponent(r.name)}`),
      emptyTitle: "No salary slips",
      emptyDescription: "Salary slips will appear here",
      newLabel: "New Salary Slip",
    }),
    [company, navigate],
  );

  return <CrmManagementPage config={config} />;
}
