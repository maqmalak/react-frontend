import { Phone, PhoneIncoming, PhoneOutgoing, Timer } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime } from "@/utils/dates";
import type { CrmCallLog } from "@/types/frappe";

const TYPES = ["Incoming", "Outgoing"];

const columns: ColumnDef<CrmCallLog>[] = [
  {
    key: "type",
    label: "Type",
    render: (r) => (
      <span className="inline-flex items-center gap-1.5 text-sm">
        {r.type === "Outgoing" ? (
          <PhoneOutgoing className="h-3.5 w-3.5 text-sky-600" />
        ) : (
          <PhoneIncoming className="h-3.5 w-3.5 text-emerald-600" />
        )}
        {r.type ?? "Incoming"}
      </span>
    ),
    getValue: (r) => r.type ?? "Incoming",
  },
  { key: "from", label: "From", render: (r) => <span className="text-sm">{r.from || "—"}</span>, getValue: (r) => r.from },
  { key: "to", label: "To", render: (r) => <span className="text-sm">{r.to || "—"}</span>, getValue: (r) => r.to },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  {
    key: "duration",
    label: "Duration",
    align: "right",
    render: (r) => {
      const d = Number(r.duration ?? 0);
      return (
        <span className="inline-flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
          <Timer className="h-3 w-3" />
          {Math.floor(d / 60)}m {d % 60}s
        </span>
      );
    },
    getValue: (r) => Number(r.duration ?? 0),
  },
  {
    key: "start_time",
    label: "Started",
    render: (r) => <span className="text-xs text-muted-foreground">{r.start_time ? formatDateTime(r.start_time) : "—"}</span>,
    getValue: (r) => r.start_time,
  },
];

const config: CrmManagementConfig<CrmCallLog> = {
  title: "Call Logs",
  subtitle: "Complete history of inbound and outbound CRM calls",
  icon: <Phone className="h-5 w-5" />,
  doctype: "CRM Call Log",
  fields: ["name", "from", "to", "status", "type", "duration", "start_time", "note", "caller", "receiver"],
  formFields: [
    { fieldname: "type", label: "Type", fieldtype: "Select", options: TYPES.join("\n"), reqd: true, default: "Outgoing" },
    { fieldname: "from", label: "From", fieldtype: "Data" },
    { fieldname: "to", label: "To", fieldtype: "Data" },
    { fieldname: "status", label: "Status", fieldtype: "Select", options: ["Ringing", "In Progress", "Completed", "Failed", "Missed"].join("\n"), default: "Completed" },
    { fieldname: "duration", label: "Duration (seconds)", fieldtype: "Int" },
    { fieldname: "start_time", label: "Start Time", fieldtype: "Datetime" },
    { fieldname: "note", label: "Note", fieldtype: "Text" },
  ],
  defaults: { type: "Outgoing", status: "Completed" },
  kanbanField: "type",
  kanbanColumns: TYPES.map((t) => ({ value: t })),
  searchField: "from",
  statusField: "type",
  statusOptions: TYPES,
  columns,
  stats: (rows) => [
    { label: "Total Calls", value: rows.length, icon: <Phone className="h-4 w-4" />, tone: "sky" },
    { label: "Incoming", value: rows.filter((r) => r.type !== "Outgoing").length, icon: <PhoneIncoming className="h-4 w-4" />, tone: "emerald" },
    { label: "Outgoing", value: rows.filter((r) => r.type === "Outgoing").length, icon: <PhoneOutgoing className="h-4 w-4" />, tone: "indigo" },
    {
      label: "Total Talk Time",
      value: `${Math.round(rows.reduce((a, r) => a + Number(r.duration ?? 0), 0) / 60)}m`,
      icon: <Timer className="h-4 w-4" />,
      tone: "amber",
    },
  ],
  rowName: (r) => `${r.type === "Outgoing" ? r.from : r.to} → ${r.type === "Outgoing" ? r.to : r.from}`,
  rowSubtitle: (r) => (r.start_time ? formatDateTime(r.start_time) : undefined),
  renderCard: (r) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {r.type === "Outgoing" ? (
          <PhoneOutgoing className="h-3.5 w-3.5 text-sky-600" />
        ) : (
          <PhoneIncoming className="h-3.5 w-3.5 text-emerald-600" />
        )}
        <p className="truncate text-sm font-medium">{r.to || r.from || "Unknown"}</p>
      </div>
      <div className="flex items-center justify-between">
        <StatusBadge status={r.status} />
        <span className="text-xs tabular-nums text-muted-foreground">{Number(r.duration ?? 0)}s</span>
      </div>
    </div>
  ),
  emptyTitle: "No call logs",
  emptyDescription: "Calls will appear here as your team makes and receives them",
  newLabel: "Log Call",
};

export default function CallLogsPage() {
  return <CrmManagementPage config={config} />;
}
