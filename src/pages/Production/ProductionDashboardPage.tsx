import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Factory, Layers, Cog, Timer, CheckCircle2, PlayCircle, Gauge, Hourglass } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { BarChart, DonutChart } from "@/components/charts/charts";
import { StatusBadge } from "@/components/common/status-badge";
import { PercentBar } from "@/components/common/percent-bar";
import { SectionCard } from "@/components/common/section-card";
import { KpiGrid, BarList, bucketByMonth } from "@/components/doc/dashboard-kit";
import { useAggregate, useDocList, useGroupCounts, count, sum } from "@/hooks/useDoc";
import { useServerDocCount } from "@/hooks/useServerTable";
import { useCompanyContext, companyFilter } from "@/hooks/useCompanyContext";
import { formatDate } from "@/utils/dates";
import { asNumber } from "@/utils/cn";

/** Production overview: orders in flight, output vs plan, downtime, machines. */
export function ProductionDashboardPage() {
  const { company } = useCompanyContext();
  const woBase = useMemo(() => [...companyFilter(company), ["docstatus", "<", 2]], [company]);
  const woSubmitted = useMemo(() => [...companyFilter(company), ["docstatus", "=", 1]], [company]);

  const { counts: byStatus } = useGroupCounts("Work Order", "status", woBase);
  const { data: totals } = useAggregate("Work Order", { fields: [sum("qty", "planned"), sum("produced_qty", "produced")], filters: woSubmitted });
  const { data: byDay } = useAggregate("Work Order", { fields: ["work_order_date", sum("qty", "planned"), sum("produced_qty", "produced")], filters: woSubmitted, groupBy: "work_order_date" });
  const { data: reasons } = useAggregate("Downtime Entry", { fields: ["stop_reason", sum("downtime", "minutes"), count("name", "events")], groupBy: "stop_reason" });
  const { data: machines } = useAggregate("Downtime Entry", { fields: ["workstation", sum("downtime", "minutes"), count("name", "events")], groupBy: "workstation" });
  const { counts: wsStatus } = useGroupCounts("Workstation", "status", [["disabled", "=", 0]]);
  const { data: activeBoms } = useServerDocCount("BOM", [["docstatus", "=", 1], ["is_active", "=", 1]]);
  const { data: recent } = useDocList("Work Order", {
    fields: ["name", "item_name", "production_item", "qty", "produced_qty", "status", "planned_start_date"],
    filters: woBase,
    orderBy: { field: "modified", order: "desc" },
    limit: 8,
  });

  const planned = asNumber(totals?.[0]?.planned);
  const produced = asNumber(totals?.[0]?.produced);
  const downtimeHours = (reasons ?? []).reduce((s, r) => s + asNumber(r.minutes), 0) / 60;
  const open = (byStatus["Not Started"] ?? 0) + (byStatus["In Process"] ?? 0);
  const running = wsStatus["Production"] ?? 0;
  const workstations = Object.values(wsStatus).reduce((a, b) => a + b, 0);

  const monthly = useMemo(() => bucketByMonth(byDay ?? [], "work_order_date", ["planned", "produced"]), [byDay]);
  const statusData = Object.entries(byStatus).filter(([s, n]) => s && n > 0).map(([label, value]) => ({ label, value }));
  const topMachines = [...(machines ?? [])].sort((a, b) => asNumber(b.minutes) - asNumber(a.minutes)).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Production" subtitle="Orders in flight, output against plan, machine downtime" icon={<Factory className="h-5 w-5" />} />

      <KpiGrid
        items={[
          { label: "Open work orders", value: open.toLocaleString(), icon: <PlayCircle className="h-4 w-4" />, tone: "sky" },
          { label: "In process", value: (byStatus["In Process"] ?? 0).toLocaleString(), icon: <Hourglass className="h-4 w-4" />, tone: "amber" },
          { label: "Completed", value: (byStatus["Completed"] ?? 0).toLocaleString(), icon: <CheckCircle2 className="h-4 w-4" />, tone: "emerald" },
          { label: "Output vs plan", value: `${planned > 0 ? Math.round((produced / planned) * 100) : 0} %`, icon: <Gauge className="h-4 w-4" />, tone: "teal" },
          { label: "Downtime", value: `${downtimeHours.toLocaleString(undefined, { maximumFractionDigits: 0 })} h`, icon: <Timer className="h-4 w-4" />, tone: "rose" },
          { label: "Machines running", value: `${running} / ${workstations}`, icon: <Cog className="h-4 w-4" />, tone: "indigo" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Output by month" subtitle="Planned vs produced quantity on submitted work orders" className="lg:col-span-2">
          {monthly.length ? (
            <BarChart data={monthly} xKey="month" series={[{ key: "planned", label: "Planned" }, { key: "produced", label: "Produced" }]} legend height={280} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No submitted work orders yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Work orders by status">
          {statusData.length ? <DonutChart data={statusData} height={280} innerRadius="60%" /> : <p className="py-16 text-center text-sm text-muted-foreground">No work orders yet.</p>}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Downtime by machine" description="Minutes stopped, top 8" className="lg:col-span-1">
          <BarList
            rows={topMachines.map((m) => ({ label: m.workstation, value: asNumber(m.minutes), hint: `${asNumber(m.events)} stoppages` }))}
            format={(v) => `${(v / 60).toLocaleString(undefined, { maximumFractionDigits: 0 })} h`}
            tone="bg-rose-500"
            empty="No downtime recorded."
          />
        </SectionCard>
        <SectionCard title="Why machines stop" description="Downtime by reason" className="lg:col-span-1">
          <BarList
            rows={[...(reasons ?? [])].sort((a, b) => asNumber(b.minutes) - asNumber(a.minutes)).map((r) => ({ label: r.stop_reason || "Unspecified", value: asNumber(r.minutes), hint: `${asNumber(r.events)} events` }))}
            format={(v) => `${(v / 60).toLocaleString(undefined, { maximumFractionDigits: 0 })} h`}
            tone="bg-amber-500"
            empty="No downtime recorded."
          />
        </SectionCard>
        <SectionCard
          title="Recent work orders"
          className="lg:col-span-1"
          actions={
            <Link to="/production/work-orders" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {(recent ?? []).map((w) => (
              <li key={w.name} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/production/work-orders/${encodeURIComponent(w.name)}`} className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline">
                    {w.name}
                  </Link>
                  <StatusBadge status={w.status || "Draft"} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {w.item_name || w.production_item} · {formatDate(w.planned_start_date)}
                </p>
                <PercentBar value={asNumber(w.qty) > 0 ? (asNumber(w.produced_qty) / asNumber(w.qty)) * 100 : 0} size="sm" className="mt-1" />
              </li>
            ))}
            {!(recent ?? []).length && <li className="py-6 text-center text-sm text-muted-foreground">No work orders yet.</li>}
          </ul>
        </SectionCard>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Layers className="h-3.5 w-3.5" /> {(activeBoms ?? 0).toLocaleString()} active BOMs
      </div>
    </div>
  );
}
