import { useMemo } from "react";
import { Wallet, CheckCircle2, Clock } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatMoney } from "@/utils/currency";
import { formatDate, todayISO } from "@/utils/dates";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { useEmployeeQueryFilter } from "@/hooks/useEmployeeQueryFilter";

interface EmployeeAdvanceRow {
  name: string;
  employee?: string;
  employee_name?: string;
  posting_date?: string;
  company?: string;
  currency?: string;
  purpose?: string;
  advance_amount?: number;
  paid_amount?: number;
  pending_amount?: number;
  status?: string;
}

const STATUSES = ["Draft", "Paid", "Partially Paid", "Unpaid", "Claimed", "Returned", "Partly Claimed and Returned", "Cancelled"];

const columns: ColumnDef<EmployeeAdvanceRow>[] = [
  { key: "posting_date", label: "Date", render: (r) => <span className="text-sm">{formatDate(r.posting_date)}</span> },
  { key: "purpose", label: "Purpose", render: (r) => <span className="truncate text-sm text-muted-foreground">{r.purpose || "—"}</span> },
  { key: "advance_amount", label: "Advance", align: "right", render: (r) => <span className="text-sm">{formatMoney(r.advance_amount, r.currency)}</span> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, getValue: (r) => r.status },
];

export default function EmployeeAdvancesPage() {
  const { company } = useCompanyContext();
  const { employee, filter: employeeFilter } = useEmployeeQueryFilter();

  const config: CrmManagementConfig<EmployeeAdvanceRow> = useMemo(
    () => ({
      title: "Employee Advances",
      subtitle: "Cash advances given to employees",
      icon: <Wallet className="h-5 w-5" />,
      doctype: "Employee Advance",
      fields: ["name", "employee", "employee_name", "posting_date", "company", "currency", "purpose", "advance_amount", "paid_amount", "pending_amount", "status"],
      filters: [...companyFilter(company), ...employeeFilter],
      formFields: [
        { fieldname: "employee", label: "Employee", fieldtype: "Link", options: "Employee", reqd: true },
        { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", reqd: true },
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "currency", label: "Currency", fieldtype: "Link", options: "Currency", reqd: true },
        { fieldname: "purpose", label: "Purpose", fieldtype: "Text", reqd: true },
        { fieldname: "advance_amount", label: "Advance Amount", fieldtype: "Currency", reqd: true },
      ],
      defaults: { company, posting_date: todayISO(), status: "Draft", employee: employee ?? undefined },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "employee_name",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      stats: (rows) => [
        { label: "Total", value: rows.length, icon: <Wallet className="h-4 w-4" />, tone: "sky" },
        { label: "Paid", value: rows.filter((r) => r.status === "Paid").length, icon: <CheckCircle2 className="h-4 w-4" />, tone: "emerald" },
        { label: "Pending", value: rows.filter((r) => r.status === "Unpaid" || r.status === "Draft").length, icon: <Clock className="h-4 w-4" />, tone: "amber" },
      ],
      rowName: (r) => r.employee_name || r.employee || r.name,
      rowSubtitle: (r) => r.purpose,
      emptyTitle: "No employee advances",
      emptyDescription: "Employee cash advances will appear here",
      newLabel: "New Employee Advance",
    }),
    [company, employee],
  );

  return <CrmManagementPage config={config} />;
}
