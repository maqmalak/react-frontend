import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Handshake,
  Plus,
  Eye,
  Trash2,
  List,
  LayoutGrid,
  Users,
  Coins,
  TrendingUp,
  X,
  Search,
  Mail,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/common/stat-card";
import { avatarTone } from "@/components/common/avatar-tone";
import { StatusBadge } from "@/components/common/status-badge";
import { FrappeDataTable, type ColumnDef } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KanbanBoard, type KanbanColumnDef } from "@/components/crm/KanbanBoard";
import { useCrmDeals, useCrmDealMutations } from "@/hooks/useCrmDeals";
import { useCrmKanban } from "@/hooks/useCrmViews";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { relativeDays, formatDate } from "@/utils/dates";
import { formatMoney } from "@/utils/currency";
import type { CrmDeal } from "@/types/frappe";

type ViewMode = "list" | "kanban";

function dealName(r: CrmDeal): string {
  return r.organization || r.organization_name || r.name || "";
}

function dealValue(r: CrmDeal): number {
  return Number(r.deal_value ?? r.expected_deal_value ?? 0);
}

function isOpenDeal(status?: string): boolean {
  const s = (status ?? "").toLowerCase();
  return !["won", "lost", "closed", "rejected", "cancelled"].some((x) => s.includes(x));
}

export function DealsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CrmDeal | null>(null);

  const filters = useMemo(() => {
    const f: unknown[][] = [];
    if (search) f.push(["organization", "like", `%${search}%`]);
    if (statusFilter) f.push(["status", "=", statusFilter]);
    return f;
  }, [search, statusFilter]);

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

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    (data ?? []).forEach((r) => {
      if (r.status) seen.add(r.status);
    });
    ["Qualification", "Analysis", "Proposal", "Negotiation", "Won", "Lost"].forEach((s) => seen.add(s));
    return [...seen];
  }, [data]);

  // Summary works from whichever dataset is live — the list rows in List view,
  // the (money-bearing) kanban rows in Pipeline view — so no second fetch.
  const stats = useMemo(() => {
    const rows = view === "list" ? (data ?? []) : kanbanRows;
    const openRows = rows.filter((r) => isOpenDeal(r.status));
    const wonRows = rows.filter((r) => (r.status ?? "").toLowerCase().includes("won"));
    const lostRows = rows.filter((r) => (r.status ?? "").toLowerCase().includes("lost"));
    const currency = rows.find((r) => r.currency)?.currency || "USD";
    return {
      total: rows.length,
      pipeline: openRows.reduce((acc, r) => acc + dealValue(r), 0),
      open: openRows.length,
      won: wonRows.reduce((acc, r) => acc + dealValue(r), 0),
      lost: lostRows.length,
      currency,
    };
  }, [view, data, kanbanRows]);

  const columns: ColumnDef<CrmDeal>[] = [
    {
      key: "organization",
      label: "Organization",
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={dealName(r)} size="sm" className={avatarTone(dealName(r))} />
          <span className="block max-w-[16rem] truncate font-medium">{dealName(r)}</span>
        </span>
      ),
    },
    { key: "lead_name", label: "Contact", render: (r) => <span className="truncate">{r.lead_name || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "deal_value",
      label: "Value",
      align: "right",
      getValue: (r) => dealValue(r),
      render: (r) => <span className="font-medium tabular-nums">{formatMoney(dealValue(r), r.currency)}</span>,
    },
    {
      key: "expected_closure_date",
      label: "Expected Close",
      render: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.expected_closure_date)}</span>,
    },
    {
      key: "deal_owner",
      label: "Owner",
      render: (r) =>
        r.deal_owner ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar name={r.deal_owner} size="sm" className={avatarTone(r.deal_owner)} />
            <span className="truncate text-xs">{r.deal_owner}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "modified",
      label: "Updated",
      sortable: true,
      getValue: (r) => r.modified ?? "",
      render: (r) => {
        const d = relativeDays(r.modified);
        return <span className="whitespace-nowrap text-xs text-muted-foreground">{d || "—"}</span>;
      },
    },
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
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Deals" value={stats.total} icon={<Users className="h-4 w-4" />} tone="primary" />
        <StatCard
          label="Pipeline Value"
          value={formatMoney(stats.pipeline, stats.currency, { compact: true })}
          icon={<Coins className="h-4 w-4" />}
          tone="sky"
        />
        <StatCard label="Open Deals" value={stats.open} icon={<TrendingUp className="h-4 w-4" />} tone="amber" />
        <StatCard
          label="Won Value"
          value={formatMoney(stats.won, stats.currency, { compact: true })}
          icon={<Handshake className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard label="Lost Deals" value={stats.lost} icon={<X className="h-4 w-4" />} tone="rose" />
      </div>

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
          striped
          searchable={false}
          rowActions={(r) => [
            { label: "Open", icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/crm/deals/${encodeURIComponent(r.name ?? "")}`) },
            { separator: true, label: "" },
            { label: "Delete", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => setPendingDelete(r) },
          ]}
          filters={
            <FilterBar>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Search</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Organization…" className="h-8 w-60 bg-transparent pl-8 text-sm" />
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 w-44 bg-transparent text-sm">
                    <option value="">All</option>
                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </label>
                {(search || statusFilter) && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); }}>
                    <X className="h-4 w-4" /> Clear
                  </Button>
                )}
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
            <article className="space-y-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={dealName(r)} size="sm" className={avatarTone(dealName(r))} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{dealName(r)}</p>
              </div>
              {r.lead_name && (
                <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />{r.lead_name}
                </p>
              )}
              {r.expected_closure_date && (
                <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDate(r.expected_closure_date)}
                </p>
              )}
              <p className="text-sm font-semibold text-emerald-600">
                {formatMoney(dealValue(r), r.currency)}
              </p>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <StatusBadge status={r.status} />
                {r.deal_owner && <span className="min-w-0 truncate text-[11px] text-muted-foreground">{r.deal_owner}</span>}
              </div>
            </article>
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
