import { StickyNote, FileText, Users } from "lucide-react";
import { CrmManagementPage, type CrmManagementConfig } from "@/components/crm/CrmManagementPage";
import type { ColumnDef } from "@/components/tables/data-table";
import { Avatar } from "@/components/ui/avatar";
import { avatarTone } from "@/components/common/avatar-tone";
import { relativeDays, formatDateTime } from "@/utils/dates";
import type { CrmNote } from "@/types/frappe";

const columns: ColumnDef<CrmNote>[] = [
  {
    key: "content",
    label: "Content",
    render: (r) => (
      <p className="max-w-md truncate text-sm text-muted-foreground">{r.content || "—"}</p>
    ),
    getValue: (r) => r.content,
  },
  {
    key: "owner",
    label: "Author",
    render: (r) =>
      r.owner ? (
        <div className="flex items-center gap-2">
          <Avatar name={r.owner} className={`h-6 w-6 text-[10px] ${avatarTone(r.owner)}`} />
          <span className="text-sm">{r.owner}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
    getValue: (r) => r.owner,
  },
  {
    key: "modified",
    label: "Updated",
    render: (r) => <span className="text-xs text-muted-foreground">{relativeDays(r.modified)}</span>,
    getValue: (r) => r.modified,
  },
];

const config: CrmManagementConfig<CrmNote> = {
  title: "Notes",
  subtitle: "Free-form notes linked to your leads, deals and organizations",
  icon: <StickyNote className="h-5 w-5" />,
  doctype: "FCRM Note",
  fields: ["name", "title", "content", "owner", "modified"],
  formFields: [
    { fieldname: "title", label: "Title", fieldtype: "Data", reqd: true },
    { fieldname: "content", label: "Content", fieldtype: "Text Editor", reqd: true },
  ],
  kanbanField: "owner",
  searchField: "title",
  statusField: "owner",
  columns,
  stats: (rows) => [
    { label: "Total Notes", value: rows.length, icon: <StickyNote className="h-4 w-4" />, tone: "amber" },
    { label: "This Week", value: rows.filter((r) => r.modified && Date.now() - new Date(r.modified).getTime() < 7 * 864e5).length, icon: <FileText className="h-4 w-4" />, tone: "sky" },
    { label: "Authors", value: new Set(rows.map((r) => r.owner).filter(Boolean)).size, icon: <Users className="h-4 w-4" />, tone: "indigo" },
  ],
  rowName: (r) => r.title || "Untitled note",
  rowSubtitle: (r) => (r.modified ? formatDateTime(r.modified) : undefined),
  renderCard: (r) => (
    <div className="space-y-2">
      <p className="truncate text-sm font-medium">{r.title || "Untitled note"}</p>
      <p className="line-clamp-2 text-xs text-muted-foreground">{r.content}</p>
    </div>
  ),
  emptyTitle: "No notes yet",
  emptyDescription: "Capture important context by creating your first note",
  newLabel: "New Note",
};

export default function NotesPage() {
  return <CrmManagementPage config={config} />;
}
