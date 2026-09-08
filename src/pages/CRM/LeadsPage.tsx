import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus, Plus, Eye, Trash2, List, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { FrappeDataTable, type ColumnDef } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KanbanBoard, type KanbanColumnDef } from "@/components/crm/KanbanBoard";
import { useCrmLeads, useCrmLeadMutations } from "@/hooks/useCrmLeads";
import { useCrmKanban } from "@/hooks/useCrmViews";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import type { CrmLead } from "@/types/frappe";

type ViewMode = "list" | "kanban";

export function LeadsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CrmLead | null>(null);

  const filters = useMemo(() => {
    const f: unknown[][] = [];
    if (search) f.push(["lead_name", "like", `%${search}%`]);
    return f;
  }, [search]);

  const { data, error, isLoading, mutate } = useCrmLeads({ filters, limit: 500, enabled: view === "list" });
  const { deleteDoc, updateDoc, loading: mutating } = useCrmLeadMutations();

  const {
    board,
    isLoading: kanbanLoading,
    mutate: mutateKanban,
  } = useCrmKanban<CrmLead>({ doctype: "CRM Lead", columnField: "status", enabled: view === "kanban" });

  const kanbanColumns: KanbanColumnDef[] = useMemo(
    () => board.columns.map((c) => ({ value: c.value, title: c.title, count: c.count })),
    [board.columns],
  );
  // The server groups rows per column but doesn't necessarily echo the
  // `status` field back on each row — stamp it on the way out of the map so
  // <KanbanBoard/>'s own client-side `groupField` grouping still works.
  const kanbanRows: CrmLead[] = useMemo(
    () => board.columns.flatMap((c) => (board.rowsByColumn.get(c.value) ?? []).map((r) => ({ ...r, status: c.value }))),
    [board.columns, board.rowsByColumn],
  );

  const columns: ColumnDef<CrmLead>[] = [
    { key: "lead_name", label: "Lead", render: (r) => <span className="font-medium">{r.lead_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.name}</span> },
    { key: "organization", label: "Organization" },
    { key: "email", label: "Email" },
    { key: "mobile_no", label: "Mobile" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "source", label: "Source" },
    { key: "lead_owner", label: "Owner" },
  ];

  const confirmDelete = async () => {
    if (!pendingDelete?.name) return;
    try {
      await deleteDoc(pendingDelete.name);
      toast.success(`Deleted ${pendingDelete.name}`);
      setPendingDelete(null);
      notifyDataChanged();
      void mutate();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

  const handleCardMove = async (row: CrmLead, newStatus: string) => {
    try {
      await updateDoc(row.name!, { status: newStatus });
      notifyDataChanged();
      void mutateKanban();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Prospects captured from any source, before they become a deal"
        icon={<UserPlus className="h-5 w-5" />}
        actions={
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
              <Button variant={view === "list" ? "outline" : "ghost"} size="sm" onClick={() => setView("list")} className={view === "list" ? "bg-background shadow-sm" : ""}>
                <List className="h-4 w-4" /> List
              </Button>
              <Button variant={view === "kanban" ? "outline" : "ghost"} size="sm" onClick={() => setView("kanban")} className={view === "kanban" ? "bg-background shadow-sm" : ""}>
                <LayoutGrid className="h-4 w-4" /> Pipeline
              </Button>
            </div>
            <Button variant="primary" onClick={() => navigate("/crm/leads/new")}>
              <Plus className="h-4 w-4" /> New Lead
            </Button>
          </>
        }
      />

      {view === "list" ? (
        <FrappeDataTable<CrmLead>
          columns={columns}
          rows={data ?? []}
          rowKey={(r) => r.name ?? ""}
          loading={isLoading}
          error={error}
          onRetry={() => void mutate()}
          onRowClick={(r) => navigate(`/crm/leads/${encodeURIComponent(r.name ?? "")}`)}
          exportFilename="crm-leads"
          emptyTitle="No leads yet"
          emptyDescription="Create your first lead to start the pipeline."
          searchPlaceholder="Search leads…"
          rowActions={(r) => [
            { label: "Open", icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/crm/leads/${encodeURIComponent(r.name ?? "")}`) },
            { separator: true, label: "" },
            { label: "Delete", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => setPendingDelete(r) },
          ]}
          filters={
            <FilterBar>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Search name</label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Lead name…" className="h-8 w-56 text-xs" />
              </div>
            </FilterBar>
          }
        />
      ) : (
        <KanbanBoard<CrmLead>
          columns={kanbanColumns}
          rows={kanbanRows}
          groupField="status"
          rowKey={(r) => r.name ?? ""}
          loading={kanbanLoading}
          onCardMove={handleCardMove}
          onCardClick={(r) => navigate(`/crm/leads/${encodeURIComponent(r.name ?? "")}`)}
          emptyDescription="Create your first lead to start the pipeline."
          renderCard={(r) => (
            <div className="space-y-1">
              <p className="text-sm font-medium">{r.lead_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.name}</p>
              {r.organization && <p className="text-xs text-muted-foreground">{r.organization}</p>}
              {r.email && <p className="truncate text-xs text-muted-foreground">{r.email}</p>}
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name}?`}
        description="This permanently removes the lead."
        confirmLabel="Delete"
        destructive
        loading={mutating}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
