import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  UserPlus,
  Plus,
  Eye,
  Trash2,
  List,
  LayoutGrid,
  Users,
  Rocket,
  TrendingUp,
  Check,
  Handshake,
  Search,
  X,
  Building2,
  Mail,
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
import { useCrmLeads, useCrmLeadMutations } from "@/hooks/useCrmLeads";
import { useCrmKanban } from "@/hooks/useCrmViews";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { relativeDays } from "@/utils/dates";
import type { CrmLead } from "@/types/frappe";

type ViewMode = "list" | "kanban";

function leadDisplayName(r: CrmLead): string {
  return r.lead_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.name || "";
}

export function LeadsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CrmLead | null>(null);

  const filters = useMemo(() => {
    const f: unknown[][] = [];
    if (search) f.push(["lead_name", "like", `%${search}%`]);
    if (statusFilter) f.push(["status", "=", statusFilter]);
    return f;
  }, [search, statusFilter]);

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

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    (data ?? []).forEach((r) => {
      if (r.status) seen.add(r.status);
    });
    ["New", "Contacted", "Nurture", "Qualified", "Converted"].forEach((s) => seen.add(s));
    return [...seen];
  }, [data]);

  // Pipeline summary works from whichever dataset is live — the list rows in
  // List view, the kanban column counts in Pipeline view — so the strip stays
  // populated without a second fetch.
  const stats = useMemo(() => {
    const isList = view === "list";
    const rows = isList ? (data ?? []) : [];
    const colCount = (s: string) => board.columns.find((c) => c.value.toLowerCase() === s.toLowerCase())?.count ?? 0;
    const has = (r: CrmLead) => (r.status ?? "").toLowerCase();
    const newLeads = isList ? rows.filter((r) => has(r) === "new").length : colCount("new");
    const active = isList
      ? rows.filter((r) => ["contacted", "nurture", "qualified"].includes(has(r))).length
      : ["Contacted", "Nurture", "Qualified"].reduce((acc, s) => acc + colCount(s), 0);
    const qualified = isList ? rows.filter((r) => has(r) === "qualified").length : colCount("qualified");
    const converted = isList
      ? rows.filter((r) => r.converted === 1 || has(r).includes("convert")).length
      : colCount("converted");
    const total = isList ? rows.length : board.columns.reduce((acc, c) => acc + (c.count ?? 0), 0);
    return { total, new: newLeads, active, qualified, converted };
  }, [view, data, board.columns]);

  const columns: ColumnDef<CrmLead>[] = [
    {
      key: "lead_name",
      label: "Lead",
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={leadDisplayName(r)} src={r.image} size="sm" className={avatarTone(leadDisplayName(r))} />
          <span className="flex min-w-0 flex-col">
            <span className="block max-w-[16rem] truncate font-medium">{leadDisplayName(r)}</span>
            {r.job_title && (
              <span className="block max-w-[16rem] truncate text-xs text-muted-foreground">{r.job_title}</span>
            )}
          </span>
        </span>
      ),
    },
    { key: "organization", label: "Organization", render: (r) => <span className="truncate">{r.organization || "—"}</span> },
    { key: "email", label: "Email", render: (r) => <span className="truncate">{r.email || "—"}</span> },
    {
      key: "mobile_no",
      label: "Mobile",
      render: (r) => <span className="whitespace-nowrap text-xs tabular-nums">{r.mobile_no || r.phone || "—"}</span>,
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "source", label: "Source", render: (r) => <span className="text-muted-foreground">{r.source || "—"}</span> },
    {
      key: "lead_owner",
      label: "Owner",
      render: (r) =>
        r.lead_owner ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar name={r.lead_owner} size="sm" className={avatarTone(r.lead_owner)} />
            <span className="truncate text-xs">{r.lead_owner}</span>
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
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={<Users className="h-4 w-4" />} tone="primary" />
        <StatCard label="New" value={stats.new} icon={<Rocket className="h-4 w-4" />} tone="sky" />
        <StatCard label="Active" value={stats.active} icon={<TrendingUp className="h-4 w-4" />} tone="amber" />
        <StatCard label="Qualified" value={stats.qualified} icon={<Check className="h-4 w-4" />} tone="indigo" />
        <StatCard label="Converted" value={stats.converted} icon={<Handshake className="h-4 w-4" />} tone="emerald" />
      </div>

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
          striped
          searchable={false}
          rowActions={(r) => [
            { label: "Open", icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/crm/leads/${encodeURIComponent(r.name ?? "")}`) },
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
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email…" className="h-8 w-60 bg-transparent pl-8 text-sm" />
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
            <article className="space-y-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={leadDisplayName(r)} src={r.image} size="sm" className={avatarTone(leadDisplayName(r))} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{leadDisplayName(r)}</p>
              </div>
              {r.organization && (
                <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />{r.organization}
                </p>
              )}
              {r.email && (
                <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />{r.email}
                </p>
              )}
              <div className="flex min-w-0 items-center justify-between gap-2">
                <StatusBadge status={r.status} />
                {r.lead_owner && <span className="min-w-0 truncate text-[11px] text-muted-foreground">{r.lead_owner}</span>}
              </div>
            </article>
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
