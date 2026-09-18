import { Repeat, Clock, AlertTriangle, CheckCircle2, CalendarClock } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime, todayISO } from "@/utils/dates";
import { useAuth } from "@/hooks/useAuth";
import type { CrmTask } from "@/types/frappe";

const STATUSES = ["Todo", "In Progress", "Done", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High"];

interface FollowUpRow extends Omit<CrmTask, "status"> {
  status?: string;
  assigned_to?: string;
}

const columns: ColumnDef<FollowUpRow>[] = [
  {
    key: "due_date",
    label: "Due",
    render: (r) => <span className="text-sm">{r.due_date ? formatDateTime(r.due_date) : "—"}</span>,
    getValue: (r) => r.due_date,
  },
  { key: "priority", label: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "assigned_to", label: "Assigned To", render: (r) => <span className="text-sm">{r.assigned_to || "—"}</span>, getValue: (r) => r.assigned_to },
  {
    key: "description",
    label: "Notes",
    render: (r) => <p className="max-w-sm truncate text-sm text-muted-foreground">{r.description || "—"}</p>,
    getValue: (r) => r.description,
  },
];

export default function FollowUpsPage() {
  const { currentUser } = useAuth();

  const config: CrmManagementConfig<FollowUpRow> = {
    title: "Follow-ups",
    subtitle: "Reminders to reconnect with leads and deals at the right time",
    icon: <Repeat className="h-5 w-5" />,
    doctype: "CRM Task",
    // Plain Tasks live on this same doctype (task_category = "Task" or
    // blank/legacy default from the Tasks page) — excluded here so a task
    // created there doesn't also show up as a duplicate row on this list.
    // A blank/legacy task_category still passes this filter, so no
    // pre-existing follow-up disappears.
    filters: [["task_category", "!=", "Task"]],
    fields: ["name", "title", "task_category", "priority", "status", "start_date", "due_date", "description", "assigned_to", "modified"],
    formFields: [
      { fieldname: "title", label: "Subject", fieldtype: "Data", reqd: true },
      { fieldname: "status", label: "Status", fieldtype: "Select", options: STATUSES.join("\n"), default: "Todo" },
      { fieldname: "priority", label: "Priority", fieldtype: "Select", options: PRIORITIES.join("\n"), default: "Medium" },
      {
        fieldname: "due_date",
        label: "Due Date & Time",
        fieldtype: "Datetime",
        description: "The reminder job checks this to the minute — a date-only value defaults to midnight, so set the actual time you want the ping.",
      },
      {
        fieldname: "assigned_to",
        label: "Assigned To",
        fieldtype: "Link",
        options: "User",
        description: "Required for the automatic overdue/due-soon reminder — a follow-up with no assignee is never notified.",
      },
      { fieldname: "description", label: "Notes", fieldtype: "Text" },
    ],
    defaults: { status: "Todo", priority: "Medium", assigned_to: currentUser ?? undefined, task_category: "Follow-up" },
    kanbanField: "status",
    kanbanColumns: STATUSES.map((s) => ({ value: s })),
    searchField: "title",
    statusField: "status",
    statusOptions: STATUSES,
    columns,
    exportFilename: "follow-ups",
    stats: (rows) => [
      { label: "Total", value: rows.length, icon: <Repeat className="h-4 w-4" />, tone: "sky" },
      { label: "Open", value: rows.filter((r) => r.status === "Todo").length, icon: <Clock className="h-4 w-4" />, tone: "indigo" },
      {
        label: "Overdue",
        value: rows.filter((r) => r.due_date && r.status !== "Done" && r.status !== "Cancelled" && r.due_date < todayISO()).length,
        icon: <AlertTriangle className="h-4 w-4" />,
        tone: "rose",
      },
      { label: "High Priority", value: rows.filter((r) => r.priority === "High" && r.status !== "Done").length, icon: <CalendarClock className="h-4 w-4" />, tone: "amber" },
      { label: "Done", value: rows.filter((r) => r.status === "Done").length, icon: <CheckCircle2 className="h-4 w-4" />, tone: "emerald" },
    ],
    rowName: (r) => r.title,
    rowSubtitle: (r) => (r.due_date ? `Due ${formatDateTime(r.due_date)}` : undefined),
    renderCard: (r) => (
      <div className="space-y-2">
        <p className="truncate text-sm font-medium">{r.title}</p>
        <div className="flex items-center justify-between">
          <StatusBadge status={r.priority} />
          <span className="text-xs text-muted-foreground">{r.due_date ? formatDateTime(r.due_date) : ""}</span>
        </div>
      </div>
    ),
    emptyTitle: "No follow-ups",
    emptyDescription: "Schedule a follow-up so no deal slips through the cracks",
    newLabel: "New Follow-up",
  };

  return <CrmManagementPage config={config} />;
}
