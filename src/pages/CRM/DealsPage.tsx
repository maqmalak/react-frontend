import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Handshake, Plus, Eye, Trash2, List, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { FrappeDataTable, type ColumnDef } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KanbanBoard, type KanbanColumnDef } from "@/components/crm/KanbanBoard";
import { useCrmDeals, useCrmDealMutations } from "@/hooks/useCrmDeals";
import { useCrmKanban } from "@/hooks/useCrmViews";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { formatMoney } from "@/utils/currency";
import type { CrmDeal } from "@/types/frappe";

type ViewMode = "list" | "kanban";

export function DealsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CrmDeal | null>(null);

  const filters = useMemo(() => {
    const f: unknown[][] = [];
    if (search) f.push(["organization", "like", `%${search}%`]);
    return f;
  }, [search]);

  const { data, error, isLoading, mutate } = useCrmDeals({ filters, limit: 500, enabled: view === "list" });
  const { deleteDoc, updateDoc, loading: mutating } = useCrmDealMutations();

  const {
    board,
    isLoading: kanbanLoading,
    mutate: mutateKanban,
  } = useCrmKanban<CrmDeal>({
    doctype: "CRM Deal",
    columnField: "status",
    kanbanFields: ["deal_value", "expected_deal_value", "currency", "lead_name"],
    enabled: view === "kanban",
  });

  const kanbanColumns: KanbanColumnDef[] = useMemo(
    () => board.columns.map((c) => ({ value: c.value, title: c.title, count: c.count })),
    [board.columns],
  );
  const kanbanRows: CrmDeal[] = useMemo(
    () => board.columns.flatMap((c) => (board.rowsByColumn.get(c.value) ?? []).map((r) => ({ ...r, status: c.value }))),
    [board.columns, board.rowsByColumn],
  );

  const columns: ColumnDef<CrmDeal>[] = [
    { key: "organization", label: "Organization", render: (r) => <span className="font-medium">{r.organization || r.organization_name || r.name}</span> },
    { key: "lead_name", label: "Contact" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "deal_value", label: "Value", align: "right", getValue: (r) => Number(r.deal_value ?? r.expected_deal_value ?? 0), render: (r) => formatMoney(r.deal_value ?? r.expected_deal_value, r.currency) },
    { key: "expected_closure_date", label: "Expected Close" },
    { key: "deal_owner", label: "Owner" },
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

  const handleCardMove = async (row: CrmDeal, newStatus: string) => {
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
        title="Deals"
        subtitle="Opportunities in progress, tracked through to close"
        icon={<Handshake className="h-5 w-5" />}
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
            <Button variant="primary" onClick={() => navigate("/crm/deals/new")}>
              <Plus className="h-4 w-4" /> New Deal
            </Button>
          </>
        }
      />

      {view === "list" ? (
        <FrappeDataTable<CrmDeal>
          columns={columns}
          rows={data ?? []}
          rowKey={(r) => r.name ?? ""}
          loading={isLoading}
          error={error}
          onRetry={() => void mutate()}
          onRowClick={(r) => navigate(`/crm/deals/${encodeURIComponent(r.name ?? "")}`)}
          exportFilename="crm-deals"
          emptyTitle="No deals yet"
          emptyDescription="Convert a lead or create a deal directly to start the pipeline."
          searchPlaceholder="Search deals…"
          rowActions={(r) => [
            { label: "Open", icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/crm/deals/${encodeURIComponent(r.name ?? "")}`) },
            { separator: true, label: "" },
            { label: "Delete", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => setPendingDelete(r) },
          ]}
          filters={
            <FilterBar>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Search organization</label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Organization…" className="h-8 w-56 text-xs" />
              </div>
            </FilterBar>
          }
        />
      ) : (
        <KanbanBoard<CrmDeal>
          columns={kanbanColumns}
          rows={kanbanRows}
          groupField="status"
          rowKey={(r) => r.name ?? ""}
          loading={kanbanLoading}
          onCardMove={handleCardMove}
          onCardClick={(r) => navigate(`/crm/deals/${encodeURIComponent(r.name ?? "")}`)}
          emptyDescription="Convert a lead or create a deal directly to start the pipeline."
          renderCard={(r) => (
            <div className="space-y-1">
              <p className="text-sm font-medium">{r.organization || r.organization_name || r.name}</p>
              {r.lead_name && <p className="text-xs text-muted-foreground">{r.lead_name}</p>}
              <p className="text-xs font-medium text-primary">{formatMoney(r.deal_value ?? r.expected_deal_value, r.currency)}</p>
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name}?`}
        description="This permanently removes the deal."
        confirmLabel="Delete"
        destructive
        loading={mutating}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
