import { FileSignature, CalendarRange, Building2, PartyPopper, Ban } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatShortDate } from "@/utils/dates";

interface CrmContractRow {
  name?: string;
  party_type?: string;
  party_name?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  contract_template?: string;
  contract_terms?: string;
  document_type?: string;
  document_name?: string;
  modified?: string;
}

const STATUSES = ["Unsigned", "Active", "Inactive", "Cancelled"];

const columns: ColumnDef<CrmContractRow>[] = [
  { key: "party_type", label: "Party Type", render: (r) => <span className="text-sm text-muted-foreground">{r.party_type || "—"}</span>, getValue: (r) => r.party_type },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "start_date", label: "Start", render: (r) => <span className="text-sm">{r.start_date ? formatShortDate(r.start_date) : "—"}</span>, getValue: (r) => r.start_date },
  { key: "end_date", label: "End", render: (r) => <span className="text-sm">{r.end_date ? formatShortDate(r.end_date) : "—"}</span>, getValue: (r) => r.end_date },
  { key: "contract_template", label: "Template", render: (r) => <span className="text-sm text-muted-foreground">{r.contract_template || "—"}</span>, getValue: (r) => r.contract_template },
];

const config: CrmManagementConfig<CrmContractRow> = {
  title: "Contracts",
  subtitle: "Agreements with customers, suppliers and employees",
  icon: <FileSignature className="h-5 w-5" />,
  doctype: "Contract",
  fields: ["name", "party_type", "party_name", "status", "start_date", "end_date", "contract_template", "contract_terms", "document_type", "document_name", "modified"],
  formFields: [
    { fieldname: "party_type", label: "Party Type", fieldtype: "Select", options: ["Customer", "Supplier", "Employee"].join("\n"), reqd: true },
    { fieldname: "party_name", label: "Party", fieldtype: "Data", reqd: true },
    { fieldname: "status", label: "Status", fieldtype: "Select", options: STATUSES.join("\n"), default: "Unsigned" },
    { fieldname: "start_date", label: "Start Date", fieldtype: "Date" },
    { fieldname: "end_date", label: "End Date", fieldtype: "Date" },
    { fieldname: "document_type", label: "Document Type", fieldtype: "Select", options: ["Quotation", "Project", "Sales Order", "Purchase Order", "Sales Invoice", "Purchase Invoice"].join("\n") },
    { fieldname: "document_name", label: "Document Name", fieldtype: "Data" },
    { fieldname: "contract_terms", label: "Contract Terms", fieldtype: "Text" },
  ],
  defaults: { status: "Unsigned" },
  kanbanField: "status",
  kanbanColumns: STATUSES.map((s) => ({ value: s })),
  searchField: "party_name",
  statusField: "status",
  statusOptions: STATUSES,
  columns,
  stats: (rows) => [
    { label: "Total", value: rows.length, icon: <FileSignature className="h-4 w-4" />, tone: "sky" },
    { label: "Unsigned", value: rows.filter((r) => r.status === "Unsigned").length, icon: <CalendarRange className="h-4 w-4" />, tone: "slate" },
    { label: "Active", value: rows.filter((r) => r.status === "Active").length, icon: <PartyPopperIcon />, tone: "emerald" },
    { label: "Inactive", value: rows.filter((r) => r.status === "Inactive").length, icon: <Building2 className="h-4 w-4" />, tone: "amber" },
    { label: "Cancelled", value: rows.filter((r) => r.status === "Cancelled").length, icon: <Ban className="h-4 w-4" />, tone: "rose" },
  ],
  rowName: (r) => r.party_name || r.name || "Contract",
  rowSubtitle: (r) => (r.end_date ? `Ends ${formatShortDate(r.end_date)}` : undefined),
  renderCard: (r) => (
    <div className="space-y-2">
      <p className="truncate text-sm font-medium">{r.party_name || r.name}</p>
      <div className="flex items-center justify-between">
        <StatusBadge status={r.status} />
        <span className="text-xs text-muted-foreground">{r.end_date ? formatShortDate(r.end_date) : ""}</span>
      </div>
    </div>
  ),
  emptyTitle: "No contracts",
  emptyDescription: "Create a contract to track agreements in one place",
  newLabel: "New Contract",
};

function PartyPopperIcon() {
  return <PartyPopper className="h-4 w-4" />;
}

export default function ContractsPage() {
  return <CrmManagementPage config={config} />;
}
