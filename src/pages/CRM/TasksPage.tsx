import { useMemo } from "react";
import { CheckSquare, Flag, ListChecks, Clock, AlertTriangle } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import { CrmReferenceCell } from "@/components/crm/CrmReferenceCell";
import type { ColumnDef } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { avatarTone } from "@/components/common/avatar-tone";
import { formatDate, relativeDays } from "@/utils/dates";
import { useCrmReferenceLabels } from "@/hooks/useCrmReferenceLabels";
import type { CrmTask } from "@/types/frappe";

const STATUSES = ["Backlog", "Todo", "In Progress", "Done", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High"];

const PRIORITY_BADGE: Record<string, string> = {
  High: "text-rose-600 bg-rose-500/10",
  Medium: "text-amber-600 bg-amber-500/10",
  Low: "text-slate-600 bg-slate-500/10",
};

export default function TasksPage() {
  const { referenceMap } = useCrmReferenceLabels();

  const columns: ColumnDef<CrmTask>[] = useMemo(
    () => [
      {
        key: "priority",
        label: "Priority",
        render: (r) => (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[r.priority ?? "Low"] ?? PRIORITY_BADGE.Low}`}>
            {r.priority ?? "Low"}
          </span>
        ),
        getValue: (r) => r.priority ?? "Low",
      },
      { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      {
        key: "reference",
        label: "Lead / Deal",
        render: (r) => <CrmReferenceCell referenceDocname={r.reference_docname} referenceMap={referenceMap} />,
        getValue: (r) => r.reference_docname,
      },
      {
        key: "due_date",
        label: "Due Date",
        render: (r) => <span className="text-sm text-muted-foreground">{r.due_date ? formatDate(r.due_date) : "—"}</span>,
        getValue: (r) => r.due_date,
      },
      {
        key: "assigned_to",
        label: "Assigned To",
        render: (r) =>
          r.assigned_to ? (
            <div className="flex items-center gap-2">
              <Avatar name={r.assigned_to} className={`h-6 w-6 text-[10px] ${avatarTone(r.assigned_to)}`} />
              <span className="text-sm">{r.assigned_to}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          ),
        getValue: (r) => r.assigned_to,
      },
      {
        key: "modified",
        label: "Updated",
        render: (r) => <span className="text-xs text-muted-foreground">{relativeDays(r.modified)}</span>,
        getValue: (r) => r.modified,
      },
    ],
    [referenceMap],
  );

  const config: CrmManagementConfig<CrmTask> = useMemo(
    () => ({
      title: "Tasks",
      subtitle: "Track and manage your team's CRM tasks",
      icon: <CheckSquare className="h-5 w-5" />,
      doctype: "CRM Task",
      fields: ["name", "title", "priority", "status", "start_date", "due_date", "assigned_to", "description", "modified", "reference_doctype", "reference_docname"],
      formFields: [
        { fieldname: "title", label: "Title", fieldtype: "Data", reqd: true },
        { fieldname: "priority", label: "Priority", fieldtype: "Select", options: PRIORITIES.join("\n"), default: "Medium" },
        { fieldname: "status", label: "Status", fieldtype: "Select", options: STATUSES.join("\n"), default: "Todo" },
        { fieldname: "due_date", label: "Due Date", fieldtype: "Date" },
        { fieldname: "assigned_to", label: "Assigned To", fieldtype: "Link", options: "User" },
        { fieldname: "description", label: "Description", fieldtype: "Text" },
      ],
      defaults: { status: "Todo", priority: "Medium" },
      kanbanField: "status",
      kanbanColumns: STATUSES.map((s) => ({ value: s })),
      searchField: "title",
      statusField: "status",
      statusOptions: STATUSES,
      columns,
      stats: (rows) => [
        { label: "Total Tasks", value: rows.length, icon: <ListChecks className="h-4 w-4" />, tone: "sky" },
        { label: "Open", value: rows.filter((r) => r.status !== "Done" && r.status !== "Cancelled").length, icon: <Clock className="h-4 w-4" />, tone: "indigo" },
        { label: "In Progress", value: rows.filter((r) => r.status === "In Progress").length, icon: <Flag className="h-4 w-4" />, tone: "amber" },
        { label: "High Priority", value: rows.filter((r) => r.priority === "High" && r.status !== "Done").length, icon: <AlertTriangle className="h-4 w-4" />, tone: "rose" },
        { label: "Done", value: rows.filter((r) => r.status === "Done").length, icon: <CheckSquare className="h-4 w-4" />, tone: "emerald" },
      ],
      rowName: (r) => r.title,
      rowSubtitle: (r) => (r.due_date ? `Due ${formatDate(r.due_date)}` : undefined),
      renderCard: (r) => (
        <div className="space-y-2">
          <p className="truncate text-sm font-medium">{r.title}</p>
          <CrmReferenceCell referenceDocname={r.reference_docname} referenceMap={referenceMap} />
          <div className="flex items-center justify-between">
            <StatusBadge status={r.status} />
            {r.assigned_to && (
              <Avatar name={r.assigned_to} className={`h-6 w-6 text-[10px] ${avatarTone(r.assigned_to)}`} />
            )}
          </div>
        </div>
      ),
      emptyTitle: "No tasks yet",
      emptyDescription: "Create your first task to start tracking work",
      newLabel: "New Task",
    }),
    [columns, referenceMap],
  );

  return <CrmManagementPage config={config} />;
}
