import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users2, UserCheck, UserX, Building2 } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate } from "@/utils/dates";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";

interface EmployeeRow {
  name: string;
  employee_name?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  status?: string;
  company?: string;
  department?: string;
  designation?: string;
  branch?: string;
  cell_number?: string;
  company_email?: string;
  user_id?: string;
  image?: string;
}

const STATUSES = ["Active", "Inactive", "Suspended", "Left"];

const columns: ColumnDef<EmployeeRow>[] = [
  { key: "department", label: "Department", getValue: (r) => r.department },
  { key: "designation", label: "Designation", getValue: (r) => r.designation },
  { key: "branch", label: "Branch", getValue: (r) => r.branch },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, getValue: (r) => r.status },
  { key: "date_of_joining", label: "Joined", render: (r) => <span className="text-sm">{formatDate(r.date_of_joining)}</span> },
];

export default function EmployeesPage() {
  const { company } = useCompanyContext();
  const navigate = useNavigate();

  const config: CrmManagementConfig<EmployeeRow> = useMemo(
    () => ({
      title: "Employees",
      subtitle: "Employee directory across departments and branches",
      icon: <Users2 className="h-5 w-5" />,
      doctype: "Employee",
      fields: [
        "name", "employee_name", "first_name", "last_name", "gender", "date_of_birth", "date_of_joining",
        "status", "company", "department", "designation", "branch", "cell_number", "company_email", "user_id", "image",
      ],
      filters: companyFilter(company),
      formFields: [
        { fieldname: "first_name", label: "First Name", fieldtype: "Data", reqd: true },
        { fieldname: "last_name", label: "Last Name", fieldtype: "Data" },
        { fieldname: "gender", label: "Gender", fieldtype: "Link", options: "Gender", reqd: true },
        { fieldname: "date_of_birth", label: "Date of Birth", fieldtype: "Date", reqd: true },
        { fieldname: "date_of_joining", label: "Date of Joining", fieldtype: "Date", reqd: true },
        { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
        { fieldname: "department", label: "Department", fieldtype: "Link", options: "Department" },
        { fieldname: "designation", label: "Designation", fieldtype: "Link", options: "Designation" },
        { fieldname: "branch", label: "Branch", fieldtype: "Link", options: "Branch" },
        { fieldname: "status", label: "Status", fieldtype: "Select", options: STATUSES.join("\n"), default: "Active" },
        { fieldname: "cell_number", label: "Mobile", fieldtype: "Data" },
        { fieldname: "company_email", label: "Company Email", fieldtype: "Data" },
        { fieldname: "user_id", label: "User ID", fieldtype: "Link", options: "User" },
      ],
      defaults: { status: "Active", company },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "employee_name",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      stats: (rows) => [
        { label: "Total", value: rows.length, icon: <Users2 className="h-4 w-4" />, tone: "sky" },
        { label: "Active", value: rows.filter((r) => r.status === "Active").length, icon: <UserCheck className="h-4 w-4" />, tone: "emerald" },
        { label: "Left / Inactive", value: rows.filter((r) => r.status === "Left" || r.status === "Inactive").length, icon: <UserX className="h-4 w-4" />, tone: "rose" },
        { label: "Departments", value: new Set(rows.map((r) => r.department).filter(Boolean)).size, icon: <Building2 className="h-4 w-4" />, tone: "indigo" },
      ],
      rowName: (r) => r.employee_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.name,
      rowImage: (r) => r.image,
      rowSubtitle: (r) => r.designation || r.department,
      onOpen: (r) => navigate(`/hr/employees/${encodeURIComponent(r.name)}`),
      emptyTitle: "No employees",
      emptyDescription: "Add your first employee to get started",
      newLabel: "New Employee",
    }),
    [company, navigate],
  );

  return <CrmManagementPage config={config} />;
}
