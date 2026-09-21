import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Eye, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/forms/frappe-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FrappeDataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { statusDotClass } from "@/components/common/status-color";
import { cn } from "@/utils/cn";
import { useDocList, useDocMutations, useGroupCounts, type Doc } from "@/hooks/useDoc";
import { useServerTable, useServerDocCount } from "@/hooks/useServerTable";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import type { DocConfig } from "./doc-config";

/**
 * Generic list screen for a DocType: status tabs with live counts, filters, server-side search,
 * sorting and paging (so it stays fast with tens of thousands of rows), row actions.
 */
export function DocListPage({ config }: { config: DocConfig }) {
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const { hasRole } = useAuth();
  const canWrite = hasRole();
  const Icon = config.icon;

  const table = useServerTable({
    searchFields: config.searchFields,
    sort: config.sort ?? { key: "modified", dir: "desc" },
    pageSize: 20,
  });

  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);

  const scoped = config.companyScoped ?? config.fields.some((f) => f.fieldname === "company");

  // Filters that define "this list" (also used for the status tab counts).
  const baseFilters = useMemo(() => {
    const f: unknown[][] = [...(scoped ? companyFilter(company) : []), ...(config.baseFilters ?? [])];
    if (config.submittable) f.push(["docstatus", "<", 2]);
    return f;
  }, [scoped, company, config.baseFilters, config.submittable]);

  // …plus whatever the user picked.
  const filters = useMemo(() => {
    const f = [...baseFilters];
    if (status && config.statusField) f.push([config.statusField, "=", status]);
    if (config.dateField && from) f.push([config.dateField, ">=", from]);
    if (config.dateField && to) f.push([config.dateField, "<=", to]);
    Object.entries(extra).forEach(([field, value]) => value && f.push([field, "=", value]));
    return f;
  }, [baseFilters, status, from, to, extra, config.statusField, config.dateField]);

  const { data, error, isLoading, mutate } = useDocList(config.doctype, {
    fields: config.listFields,
    filters,
    orFilters: table.orFilters,
    limit: table.pageSize,
    limitStart: table.limitStart,
    orderBy: table.orderBy,
  });
  const { data: total } = useServerDocCount(config.doctype, filters, table.orFilters);
  const { counts } = useGroupCounts(config.doctype, config.statusField, baseFilters);
  const { deleteDoc, loading: deleting } = useDocMutations(config.doctype);

  // Status tabs: configured order first, then any status that actually exists.
  const tabs = useMemo(() => {
    if (!config.statusField) return [];
    const known = config.statuses ?? [];
    const extraStatuses = Object.keys(counts).filter((s) => s && !known.includes(s));
    return [...known, ...extraStatuses].filter((s) => (counts[s] ?? 0) > 0 || known.includes(s));
  }, [config.statusField, config.statuses, counts]);
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const rowLink = (r: Doc) => `${config.base}/${encodeURIComponent(String(r.name))}`;
  const canDelete = (r: Doc) => canWrite && (!config.submittable || r.docstatus === 0 || r.docstatus === undefined);

  const confirmDelete = async () => {
    if (!pendingDelete?.name) return;
    try {
      await deleteDoc(String(pendingDelete.name));
      toast.success(`Deleted ${pendingDelete.name}`);
      setPendingDelete(null);
      notifyDataChanged();
      void mutate();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

  const clearFilters = () => {
    setStatus("");
    setFrom("");
    setTo("");
    setExtra({});
  };
  const hasFilters = Boolean(status || from || to || Object.values(extra).some(Boolean));

  return (
    <div className="space-y-5">
      <PageHeader
        title={config.plural}
        subtitle={config.subtitle}
        icon={<Icon className="h-5 w-5" />}
        actions={
          canWrite ? (
            <Button variant="primary" onClick={() => navigate(`${config.base}/new`)}>
              <Plus className="h-4 w-4" /> New {config.singular}
            </Button>
          ) : undefined
        }
      />

      {config.listHeaderExtra}

      {tabs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={`${config.plural} by status`}>
          <StatusTab label="All" count={allCount} active={!status} onClick={() => setStatus("")} />
          {tabs.map((s) => (
            <StatusTab key={s} label={s} count={counts[s] ?? 0} dot={statusDotClass(s)} active={status === s} onClick={() => setStatus(status === s ? "" : s)} />
          ))}
        </div>
      )}

      <FrappeDataTable
        columns={config.columns}
        rows={data ?? []}
        rowKey={(r) => String(r.name)}
        loading={isLoading}
        error={error}
        onRetry={() => void mutate()}
        onRowClick={(r) => navigate(rowLink(r))}
        title={config.plural}
        subtitle={`${(total ?? 0).toLocaleString()} ${config.plural.toLowerCase()}`}
        serverSide={table.controls(total ?? 0)}
        pageSizeOptions={[20, 50, 100, 200]}
        searchPlaceholder={`Search ${config.plural.toLowerCase()}…`}
        exportFilename={config.doctype.toLowerCase().replace(/\s+/g, "-")}
        emptyTitle={hasFilters || table.controls(0).query ? `No ${config.plural.toLowerCase()} match` : `No ${config.plural.toLowerCase()} yet`}
        emptyDescription={
          hasFilters || table.controls(0).query
            ? "Try clearing the filters or the search."
            : canWrite
              ? `Click "New ${config.singular}" to create the first one.`
              : undefined
        }
        rowActions={(r) => [
          { label: "Open", icon: <Eye className="h-4 w-4" />, onClick: () => navigate(rowLink(r)) },
          ...(canDelete(r)
            ? [
                { separator: true, label: "" },
                { label: "Delete", icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => setPendingDelete(r) },
              ]
            : []),
        ]}
        filters={
          (config.dateField || (config.filters?.length ?? 0) > 0 || hasFilters) && (
            <FilterBar>
              {config.filters?.map((f) => (
                <div key={f.field} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  <FilterSelect
                    value={extra[f.field] ?? ""}
                    onChange={(v) => setExtra((prev) => ({ ...prev, [f.field]: v }))}
                    options={f.options}
                    optionsFrom={f.optionsFrom}
                  />
                </div>
              ))}
              {config.dateField && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">{config.dateLabel ?? "Date"} from</label>
                    <DateInput type="date" value={from} onValue={setFrom} className="h-8 w-36 text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">to</label>
                    <DateInput type="date" value={to} onValue={setTo} className="h-8 w-36 text-xs" />
                  </div>
                </>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" className="mt-5" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </FilterBar>
          )
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name}?`}
        description={`This permanently removes the ${config.singular.toLowerCase()}.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function StatusTab({ label, count, active, dot, onClick }: { label: string; count: number; active: boolean; dot?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />}
      {label}
      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", active ? "bg-primary/15" : "bg-muted")}>{count.toLocaleString()}</span>
    </button>
  );
}

/** A filter dropdown whose options are fixed, or listed from another DocType's names. */
function FilterSelect({ value, onChange, options, optionsFrom }: { value: string; onChange: (v: string) => void; options?: string[]; optionsFrom?: string }) {
  const { data } = useDocList(optionsFrom ?? "User", { fields: ["name"], limit: 200, orderBy: { field: "name", order: "asc" }, enabled: Boolean(optionsFrom) });
  const list = options ?? (data ?? []).map((r) => String(r.name));
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-44 text-xs">
      <option value="">All</option>
      {list.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  );
}
