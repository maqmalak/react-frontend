import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, ChevronsDownUp, ChevronsUpDown, Minus, Plus, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FrappeLinkField } from "@/components/forms/field-primitives";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { cn } from "@/utils/cn";
import { formatMoney, formatNumber } from "@/utils/currency";

// ------------------------------------------------------------------ baseline (micromax.cost_simulator.get_plan_baseline)
interface RawRow { code: string; name: string; uom: string; qty: number; rate: number }
interface OpRow { component: string; category: "operators" | "power" | "consumables" | "machine"; hours: number; rate: number; operations: string[] }
interface Baseline {
  plan: string;
  company: string;
  currency: string;
  posting_date: string;
  uom: string;
  output: number;
  yield: number;
  products: { item: string; item_name: string; qty: number; bom: string; uom: string; yield: number }[];
  raw_materials: RawRow[];
  operations: OpRow[];
  waste: RawRow[];
  overheads: { from: string; to: string; basis_qty: number; factory_per_unit: number; admin_per_unit: number };
}

// ------------------------------------------------------------------ drivers
interface Drivers {
  volume: number; // % change in planned output
  yieldPct: number; // absolute yield %
  efficiency: number; // machine efficiency % (100 = standard time)
  fibre: number; // % change in raw material prices
  wages: number; // % change in operator wage rates
  power: number; // % change in power tariff
  wastePrice: number; // % change in waste selling price
  factoryOh: number; // factory overhead per unit at plan volume
  adminOh: number; // admin & selling overhead per unit at plan volume
  leaf: Record<string, number>; // per-leaf % change on its rate
}
const baseDrivers = (b: Baseline): Drivers => ({
  volume: 0, yieldPct: b.yield, efficiency: 100, fibre: 0, wages: 0, power: 0, wastePrice: 0,
  factoryOh: b.overheads.factory_per_unit, adminOh: b.overheads.admin_per_unit, leaf: {},
});

const CATS: { id: OpRow["category"]; label: string }[] = [
  { id: "operators", label: "Operators (labour)" },
  { id: "power", label: "Power" },
  { id: "consumables", label: "Consumables & spares" },
  { id: "machine", label: "Machine & other" },
];

// ------------------------------------------------------------------ the cost tree
interface CostNode {
  id: string;
  label: string;
  value: number; // simulated total
  base: number; // baseline total
  detail?: string; // e.g. "4,000 Kg × Rs 417"
  leaf?: boolean; // has its own % driver
  sign?: -1; // credits (waste) reduce cost
  children?: CostNode[];
}

function simulate(b: Baseline, d: Drivers) {
  const vol = 1 + d.volume / 100;
  const out = b.output * vol;
  const y0 = b.yield || 100;
  const consume = y0 / Math.max(1, d.yieldPct); // lower yield → more fibre per kg of yarn
  const wasteFactor = y0 < 100 ? Math.max(0, 100 - d.yieldPct) / (100 - y0) : 1;
  const time = 100 / Math.max(1, d.efficiency);
  const lf = (id: string) => 1 + (d.leaf[id] ?? 0) / 100;
  const catPct: Record<OpRow["category"], number> = { operators: d.wages, power: d.power, consumables: 0, machine: 0 };

  const rm: CostNode[] = b.raw_materials.map((r) => {
    const id = `rm:${r.code}`;
    const qty = r.qty * vol * consume;
    const rate = r.rate * (1 + d.fibre / 100) * lf(id);
    return { id, label: r.name || r.code, value: qty * rate, base: r.qty * r.rate, leaf: true,
      detail: `${formatNumber(qty, 0)} ${r.uom} × ${formatNumber(rate, 1)}` };
  });
  const cats: CostNode[] = CATS.map((c) => {
    const kids = b.operations
      .filter((o) => o.category === c.id)
      .map((o) => {
        const id = `op:${o.component}`;
        const hours = o.hours * vol * time;
        const rate = o.rate * (1 + catPct[c.id] / 100) * lf(id);
        return { id, label: o.component, value: hours * rate, base: o.hours * o.rate, leaf: true,
          detail: `${formatNumber(hours, 0)} h × ${formatNumber(rate, 1)}/h · ${o.operations.length} operations` };
      });
    return { id: `cat:${c.id}`, label: c.label, value: sum(kids, "value"), base: sum(kids, "base"), children: kids };
  }).filter((c) => c.children!.length);
  const oh: CostNode[] = [
    { id: "oh:factory", label: "Factory overhead (not in machine rates)", value: d.factoryOh * b.output * lf("oh:factory"), base: b.overheads.factory_per_unit * b.output,
      leaf: true, detail: "fixed for the period — spread over more output, it falls per unit" },
    { id: "oh:admin", label: "Admin & selling", value: d.adminOh * b.output * lf("oh:admin"), base: b.overheads.admin_per_unit * b.output,
      leaf: true, detail: "fixed for the period" },
  ];
  const waste: CostNode[] = b.waste.map((w) => {
    const id = `w:${w.code}`;
    const qty = w.qty * vol * wasteFactor;
    const rate = w.rate * (1 + d.wastePrice / 100) * lf(id);
    return { id, label: w.name || w.code, value: qty * rate, base: w.qty * w.rate, leaf: true, sign: -1,
      detail: `${formatNumber(qty, 0)} ${w.uom} × ${formatNumber(rate, 1)}` };
  });
  const groups = ([
    { id: "g:rm", label: "Raw materials", value: sum(rm, "value"), base: sum(rm, "base"), children: rm },
    { id: "g:conv", label: "Conversion (operations)", value: sum(cats, "value"), base: sum(cats, "base"), children: cats },
    { id: "g:oh", label: "Overheads", value: sum(oh, "value"), base: sum(oh, "base"), children: oh },
    { id: "g:waste", label: "Waste credit", value: sum(waste, "value"), base: sum(waste, "base"), children: waste, sign: -1 },
  ] as CostNode[]).filter((g) => g.children!.length);
  const total = groups.reduce((s, g) => s + (g.sign ? -g.value : g.value), 0);
  const baseTotal = groups.reduce((s, g) => s + (g.sign ? -g.base : g.base), 0);
  return { out, total, baseTotal, groups, cats };
}
const sum = (rows: CostNode[], k: "value" | "base") => rows.reduce((s, r) => s + r[k], 0);

// ------------------------------------------------------------------ page
/** valQ-style production cost simulator: a Production Plan's standard cost as a driver tree (cost per unit → raw
 * materials / operators / power / overheads / waste credit → individual items), with sliders to test scenarios. */
export function CostSimulatorPage() {
  const { company, companyCurrency } = useCompanyContext();
  const [params, setParams] = useSearchParams();
  const plan = params.get("plan") ?? "";
  const { data, error, isLoading } = useFrappeGetCall<{ message: Baseline }>(
    "micromax.cost_simulator.get_plan_baseline",
    { production_plan: plan },
    plan ? `cost-sim-${plan}` : null,
    { revalidateOnFocus: false },
  );
  const b = data?.message;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Production Cost Simulator"
        subtitle="Cost per unit of a production plan, broken down to every material and cost driver — change a driver and see the end cost move"
        icon={<Calculator className="h-5 w-5" />}
      />
      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="w-full sm:w-[320px]">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Production plan</span>
          <FrappeLinkField
            meta={{ fieldname: "plan", label: "Production plan", fieldtype: "Link", options: "Production Plan", placeholder: "Choose a submitted plan…",
              filters: [["docstatus", "=", 1], ...(company ? [["company", "=", company]] : [])] }}
            value={plan}
            onChange={(v) => setParams(v ? { plan: v } : {})}
            allowCreate={false}
          />
        </div>
        {b && (
          <p className="text-xs text-muted-foreground">
            {b.products.length} product{b.products.length === 1 ? "" : "s"} · {formatNumber(b.output, 0)} {b.uom} planned · {b.posting_date} · standard yield {b.yield}%
          </p>
        )}
      </Card>
      {!plan ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Choose a production plan to load its cost structure.</Card>
      ) : error ? (
        <Card className="p-6 text-sm text-rose-600">{String((error as any)?.message ?? "Could not load the plan's costs.")}</Card>
      ) : isLoading || !b ? (
        <Skeleton className="h-[520px] rounded-lg" />
      ) : (
        <Simulator key={b.plan} b={b} currency={b.currency || companyCurrency || "PKR"} />
      )}
    </div>
  );
}

function Simulator({ b, currency }: { b: Baseline; currency: string }) {
  const [d, setD] = useState<Drivers>(() => baseDrivers(b));
  const [open, setOpen] = useState<Set<string>>(() => new Set(["root", "g:rm", "g:conv"]));
  const sim = useMemo(() => simulate(b, d), [b, d]);
  const unit = sim.total / (sim.out || 1);
  const baseUnit = sim.baseTotal / (b.output || 1);
  const money = (v: number) => formatMoney(v, currency);
  const set = (patch: Partial<Drivers>) => setD((x) => ({ ...x, ...patch }));
  const setLeaf = (id: string, v: number) => setD((x) => ({ ...x, leaf: { ...x.leaf, [id]: v } }));

  const root: CostNode = { id: "root", label: `Cost per ${b.uom || "unit"}`, value: sim.total, base: sim.baseTotal, children: sim.groups };
  const allIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (n: CostNode) => {
      if (n.children?.length) ids.push(n.id);
      n.children?.forEach(walk);
    };
    walk(root);
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  // waterfall: baseline cost/unit → change per group → simulated
  const waterfall = useMemo(() => {
    const rows: { name: string; base: number; delta: number; color: string; label: string }[] = [];
    let run = baseUnit;
    rows.push({ name: "Baseline", base: 0, delta: baseUnit, color: "hsl(215 16% 65%)", label: money(baseUnit) });
    const parts: { name: string; v: number; b0: number }[] = [
      ...sim.groups.filter((g) => g.id !== "g:conv").map((g) => ({ name: g.label, v: (g.sign ? -g.value : g.value), b0: (g.sign ? -g.base : g.base) })),
      ...sim.cats.map((c) => ({ name: c.label, v: c.value, b0: c.base })),
    ];
    parts.forEach((p) => {
      const delta = p.v / (sim.out || 1) - p.b0 / (b.output || 1);
      if (Math.abs(delta) < 0.005) return;
      rows.push({ name: p.name, base: delta >= 0 ? run : run + delta, delta: Math.abs(delta),
        color: delta >= 0 ? "hsl(351 95% 59%)" : "hsl(160 84% 39%)", label: `${delta >= 0 ? "+" : "−"}${formatNumber(Math.abs(delta), 2)}` });
      run += delta;
    });
    rows.push({ name: "Simulated", base: 0, delta: unit, color: "hsl(221 83% 53%)", label: money(unit) });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  // sensitivity: cost per unit across output volume, other drivers as set
  const curve = useMemo(
    () =>
      [-40, -30, -20, -10, 0, 10, 20, 30, 40].map((v) => {
        const s = simulate(b, { ...d, volume: v });
        return { volume: `${v > 0 ? "+" : ""}${v}%`, v, cpu: Math.round((s.total / (s.out || 1)) * 100) / 100 };
      }),
    [b, d],
  );

  return (
    <div className="space-y-4">
      {/* headline */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Baseline cost / ${b.uom}`} value={money(baseUnit)} />
        <Stat label={`Simulated cost / ${b.uom}`} value={money(unit)} delta={baseUnit ? ((unit - baseUnit) / baseUnit) * 100 : 0} />
        <Stat label="Simulated total cost" value={money(sim.total)} hint={`baseline ${money(sim.baseTotal)}`} />
        <Stat label="Output" value={`${formatNumber(sim.out, 0)} ${b.uom}`} hint={`yield ${formatNumber(d.yieldPct, 1)}%`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* drivers */}
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Drivers</h3>
            <Button variant="ghost" size="sm" onClick={() => setD(baseDrivers(b))}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          <Slider label="Output volume" value={d.volume} min={-50} max={50} unit="%" onChange={(v) => set({ volume: v })} hint="fixed overheads spread over more / fewer units" />
          <Slider label="Yield" value={d.yieldPct} min={Math.max(70, Math.floor(b.yield - 15))} max={100} step={0.1} unit="%" onChange={(v) => set({ yieldPct: v })} hint={`standard ${b.yield}% — drives fibre consumed and waste`} />
          <Slider label="Machine efficiency" value={d.efficiency} min={60} max={130} unit="%" onChange={(v) => set({ efficiency: v })} hint="100% = standard routing time" />
          <Slider label="Fibre price" value={d.fibre} min={-40} max={60} unit="%" onChange={(v) => set({ fibre: v })} />
          <Slider label="Operator wage rate" value={d.wages} min={-30} max={60} unit="%" onChange={(v) => set({ wages: v })} />
          <Slider label="Power tariff" value={d.power} min={-30} max={80} unit="%" onChange={(v) => set({ power: v })} />
          <Slider label="Waste selling price" value={d.wastePrice} min={-50} max={100} unit="%" onChange={(v) => set({ wastePrice: v })} />
          <NumberDriver label={`Factory overhead / ${b.uom}`} value={d.factoryOh} onChange={(v) => set({ factoryOh: v })} />
          <NumberDriver label={`Admin & selling / ${b.uom}`} value={d.adminOh} onChange={(v) => set({ adminOh: v })} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Overheads per unit come from the ledger {b.overheads.from} → {b.overheads.to}. Every item in the tree also has its own rate slider.
          </p>
        </Card>

        {/* tree */}
        <Card className="min-w-0 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Cost driver tree</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(new Set(allIds))}>
                <ChevronsUpDown className="mr-1 h-3.5 w-3.5" /> Expand all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(new Set(["root"]))}>
                <ChevronsDownUp className="mr-1 h-3.5 w-3.5" /> Collapse
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <TreeNode
              node={root}
              out={sim.out}
              baseOut={b.output}
              money={money}
              open={open}
              toggle={(id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
              leaf={d.leaf}
              setLeaf={setLeaf}
              isRoot
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Cost per {b.uom}: baseline → simulated</h3>
          <p className="mb-2 text-xs text-muted-foreground">Red raises the cost, green lowers it</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={waterfall} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[(min: number) => Math.max(0, Math.floor(min * 0.95)), "auto"]} />
              <Tooltip formatter={(_v: any, _n: any, p: any) => [p.payload.label, p.payload.name]} />
              <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="delta" stackId="w" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {waterfall.map((r) => (
                  <Cell key={r.name} fill={r.color} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Cost per {b.uom} vs output volume</h3>
          <p className="mb-2 text-xs text-muted-foreground">With the other drivers as set — fixed overheads make small lots dearer</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="volume" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: any) => [money(Number(v)), `Cost / ${b.uom}`]} />
              <Line type="monotone" dataKey="cpu" stroke="hsl(221 83% 53%)" strokeWidth={2} dot={{ r: 3 }} />
              <ReferenceDot x={`${d.volume > 0 ? "+" : ""}${Math.round(d.volume / 10) * 10}%`} y={curve.find((c) => c.v === Math.round(d.volume / 10) * 10)?.cpu} r={6} fill="hsl(351 95% 59%)" stroke="none" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pieces
function Stat({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: number }) {
  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-bold tabular-nums">{value}</p>
      {delta != null ? (
        <p className={cn("text-xs font-semibold tabular-nums", Math.abs(delta) < 0.05 ? "text-muted-foreground" : delta > 0 ? "text-rose-600" : "text-emerald-600")}>
          {delta > 0 ? "+" : ""}
          {formatNumber(delta, 2)}% vs baseline
        </p>
      ) : (
        <p className="truncate text-xs text-muted-foreground">{hint ?? " "}</p>
      )}
    </Card>
  );
}

function Slider({ label, value, min, max, step = 1, unit, onChange, hint }: {
  label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-medium">
        {label}
        <span className="tabular-nums text-muted-foreground">
          {unit === "%" && label !== "Yield" && label !== "Machine efficiency" && value > 0 ? "+" : ""}
          {formatNumber(value, step < 1 ? 1 : 0)}
          {unit}
        </span>
      </span>
      <input type="range" className="mt-1 w-full accent-primary" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function NumberDriver({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="number"
        step="0.01"
        min={0}
        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm tabular-nums"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </label>
  );
}

function TreeNode({ node, out, baseOut, money, open, toggle, leaf, setLeaf, isRoot }: {
  node: CostNode; out: number; baseOut: number; money: (v: number) => string; open: Set<string>; toggle: (id: string) => void;
  leaf: Record<string, number>; setLeaf: (id: string, v: number) => void; isRoot?: boolean;
}) {
  const hasKids = !!node.children?.length;
  const expanded = hasKids && open.has(node.id);
  const perUnit = node.value / (out || 1);
  const basePerUnit = node.base / (baseOut || 1);
  const change = basePerUnit ? ((perUnit - basePerUnit) / Math.abs(basePerUnit)) * 100 : 0;
  // for a credit (waste), a higher value is good
  const good = node.sign ? change > 0 : change < 0;
  return (
    <div className="flex items-start">
      <div
        className={cn(
          "relative w-[250px] shrink-0 rounded-lg border bg-card p-3 shadow-sm",
          isRoot ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={cn("min-w-0 text-xs font-semibold leading-snug", node.sign && "text-emerald-700 dark:text-emerald-400")}>
            {node.sign ? "− " : ""}
            {node.label}
          </p>
          {hasKids && (
            <button
              type="button"
              aria-label={expanded ? "Collapse" : "Expand"}
              onClick={() => toggle(node.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted"
            >
              {expanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          )}
        </div>
        <p className="mt-1 text-lg font-bold tabular-nums leading-tight">
          {money(perUnit)}
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">/ unit</span>
        </p>
        <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{money(node.value)}</span>
          {Math.abs(change) >= 0.05 && (
            <span className={cn("font-semibold", good ? "text-emerald-600" : "text-rose-600")}>
              {change > 0 ? "+" : ""}
              {formatNumber(change, 1)}%
            </span>
          )}
        </div>
        {node.detail && <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{node.detail}</p>}
        {node.leaf && (
          <label className="mt-2 block">
            <span className="flex justify-between text-[10px] text-muted-foreground">
              rate
              <span className="tabular-nums">
                {(leaf[node.id] ?? 0) > 0 ? "+" : ""}
                {leaf[node.id] ?? 0}%
              </span>
            </span>
            <input
              type="range"
              min={-50}
              max={50}
              value={leaf[node.id] ?? 0}
              onChange={(e) => setLeaf(node.id, Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
        )}
      </div>
      {expanded && (
        <div className="ml-6 flex flex-col gap-3 border-l-2 border-border py-1 pl-6">
          {node.children!.map((c) => (
            <div key={c.id} className="relative before:absolute before:-left-6 before:top-6 before:w-6 before:border-t-2 before:border-border">
              <TreeNode node={c} out={out} baseOut={baseOut} money={money} open={open} toggle={toggle} leaf={leaf} setLeaf={setLeaf} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
