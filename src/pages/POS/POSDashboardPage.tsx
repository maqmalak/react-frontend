import { Link } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Award, Banknote, DoorClosed, DoorOpen, Gift, Percent, ReceiptText, ShoppingCart, Store, Ticket, TrendingUp, Undo2, Users, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/currency";

interface Totals { count: number; amount: number; returns: number }
interface Dash {
  today: Totals; month: Totals;
  month_extras: { credit: number; coupons: number; loyalty: number; refunds: number; bill_discounts: number; customers: number };
  by_mode: { mode: string; amount: number }[];
  by_cashier: { user: string; profile: string; count: number; amount: number }[];
  top_items: { item: string; qty: number; amount: number }[];
  hourly: { hour: number; amount: number }[];
  daily: { date: string; amount: number }[];
  open_shifts: { name: string; pos_profile: string; user: string; period_start_date: string }[];
  closings: { name: string; pos_profile: string; user: string; period_end_date: string; grand_total: number; status: string }[];
}

const PIE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#8b5cf6"];
const short = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(Math.round(v)));

/** /pos — the point-of-sale home: today's and this month's takings, tenders, cashiers, best sellers, shifts. */
export default function POSDashboardPage() {
  const { company, companyCurrency } = useCompanyContext();
  const { data, isLoading } = useFrappeGetCall<{ message: Dash }>("mm_core.pos.dashboard", company ? { company } : undefined, company ? `pos.dash.${company}` : null,
    { refreshInterval: 60_000 });
  const d = data?.message;
  const money = (v?: number) => formatMoney(v ?? 0, companyCurrency ?? "PKR");
  const avg = d && d.today.count ? d.today.amount / d.today.count : 0;
  const hours = Array.from({ length: 15 }, (_, i) => i + 8).map((h) => ({ hour: `${h}:00`, amount: d?.hourly.find((x) => x.hour === h)?.amount ?? 0 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white shadow"><Store className="h-5 w-5" /></span>
        <div><h1 className="text-xl font-semibold">Point of Sale</h1><p className="text-xs text-muted-foreground">Counter sales for {company} — refreshed every minute</p></div>
        <Link to="/pos/terminal" className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
          <ShoppingCart className="h-4 w-4" /> Open terminal</Link>
      </div>

      {isLoading || !d ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Banknote} tone="from-emerald-500 to-teal-600" label="Today's sales" value={money(d.today.amount)} sub={`${d.today.count} invoices · ${d.today.returns} returns`} />
            <Kpi icon={ReceiptText} tone="from-sky-500 to-blue-600" label="Average basket" value={money(avg)} sub="today" />
            <Kpi icon={TrendingUp} tone="from-violet-500 to-indigo-600" label="This month" value={money(d.month.amount)} sub={`${d.month.count} invoices · ${d.month_extras.customers} customers`} />
            <Kpi icon={DoorOpen} tone="from-amber-500 to-orange-600" label="Open shifts" value={String(d.open_shifts.length)} sub={d.open_shifts.map((s) => s.user).join(", ") || "all counters closed"} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Mini icon={Wallet} label="On credit (month)" value={money(d.month_extras.credit)} tone="text-rose-600" />
            <Mini icon={Undo2} label="Refunds" value={money(d.month_extras.refunds)} tone="text-rose-600" />
            <Mini icon={Percent} label="Bill discounts" value={money(d.month_extras.bill_discounts)} tone="text-amber-600" />
            <Mini icon={Ticket} label="Coupons used" value={String(d.month_extras.coupons)} tone="text-violet-600" />
            <Mini icon={Award} label="Loyalty redeemed" value={money(d.month_extras.loyalty)} tone="text-amber-600" />
            <Mini icon={Users} label="Customers" value={String(d.month_extras.customers)} tone="text-sky-600" />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Last 14 days" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.daily.map((x) => ({ ...x, day: x.date.slice(5) }))} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs><linearGradient id="posDaily" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={short} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={44} />
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#posDaily)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Tenders today">
              {d.by_mode.length === 0 ? <Empty /> : (
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width="55%" height={180}>
                    <PieChart><Pie data={d.by_mode} dataKey="amount" nameKey="mode" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {d.by_mode.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie>
                      <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} /></PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 space-y-1.5 text-sm">{d.by_mode.map((m, i) => (
                    <li key={m.mode} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                      <span className="flex-1 truncate">{m.mode}</span><span className="tabular-nums font-medium">{money(m.amount)}</span></li>))}</ul>
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Today by hour">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hours} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={1} />
                  <YAxis tickFormatter={short} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Best sellers this month">
              {d.top_items.length === 0 ? <Empty /> : (
                <ul className="space-y-2">{d.top_items.map((t) => {
                  const pct = (t.amount / (d.top_items[0]?.amount || 1)) * 100;
                  return (
                    <li key={t.item} className="space-y-0.5 text-sm">
                      <div className="flex justify-between gap-2"><span className="truncate">{t.item}</span><span className="tabular-nums font-medium">{money(t.amount)}</span></div>
                      <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${pct}%` }} /></div>
                        <span className="w-16 text-right text-[11px] text-muted-foreground tabular-nums">{t.qty} qty</span></div>
                    </li>
                  );
                })}</ul>
              )}
            </Panel>
            <Panel title="Cashiers this month">
              {d.by_cashier.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border">{d.by_cashier.map((c) => (
                  <li key={`${c.user}-${c.profile}`} className="flex items-center gap-2 py-2 text-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{c.user.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                    <div className="min-w-0 flex-1"><div className="truncate font-medium">{c.user}</div><div className="truncate text-[11px] text-muted-foreground">{c.profile} · {c.count} sales</div></div>
                    <span className="tabular-nums font-semibold">{money(c.amount)}</span>
                  </li>))}</ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Open shifts" action={<Link to="/pos/openings" className="text-xs text-primary hover:underline">All openings</Link>}>
              {d.open_shifts.length === 0 ? <Empty text="No shift is open." /> : (
                <ul className="divide-y divide-border">{d.open_shifts.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 py-2 text-sm"><DoorOpen className="h-4 w-4 text-emerald-500" />
                    <Link to={`/pos/openings/${encodeURIComponent(s.name)}`} className="font-medium hover:underline">{s.name}</Link>
                    <span className="flex-1 truncate text-muted-foreground">{s.pos_profile} · {s.user}</span>
                    <span className="text-[11px] text-muted-foreground">since {s.period_start_date.slice(0, 16)}</span></li>))}</ul>
              )}
            </Panel>
            <Panel title="Recent closings" action={<Link to="/pos/closings" className="text-xs text-primary hover:underline">All closings</Link>}>
              {d.closings.length === 0 ? <Empty text="No shift closed yet." /> : (
                <ul className="divide-y divide-border">{d.closings.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 py-2 text-sm"><DoorClosed className="h-4 w-4 text-muted-foreground" />
                    <Link to={`/pos/closings/${encodeURIComponent(c.name)}`} className="font-medium hover:underline">{c.name}</Link>
                    <span className="flex-1 truncate text-muted-foreground">{c.pos_profile} · {c.period_end_date?.slice(0, 16)}</span>
                    <span className={cn("rounded px-1.5 text-[10px]", c.status === "Submitted" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>{c.status}</span>
                    <span className="tabular-nums font-medium">{money(c.grand_total)}</span></li>))}</ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <QuickLink to="/pos/profiles" icon={Store} label="POS Profiles" sub="Counters, tenders, cashiers" />
            <QuickLink to="/selling/pricing-rules" icon={Gift} label="Offers" sub="Pricing rules applied at the counter" />
            <QuickLink to="/pos/coupons" icon={Ticket} label="Coupons & loyalty" sub="Coupon codes, loyalty programs" />
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, value, sub }: { icon: typeof Store; tone: string; label: string; value: string; sub: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className={cn("absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-15", tone)} />
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow", tone)}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate text-xl font-bold tabular-nums">{value}</div></div>
      </div>
      <div className="mt-2 truncate text-[11px] text-muted-foreground">{sub}</div>
    </Card>
  );
}

function Mini({ icon: Icon, label, value, tone }: { icon: typeof Store; label: string; value: string; tone: string }) {
  return (
    <Card className="flex items-center gap-2 p-3">
      <Icon className={cn("h-4 w-4 shrink-0", tone)} />
      <div className="min-w-0"><div className="truncate text-[11px] text-muted-foreground">{label}</div><div className="truncate text-sm font-semibold tabular-nums">{value}</div></div>
    </Card>
  );
}

function Panel({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("space-y-3 p-4", className)}>
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">{title}</h2>{action}</div>
      {children}
    </Card>
  );
}

function Empty({ text = "No sales yet." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function QuickLink({ to, icon: Icon, label, sub }: { to: string; icon: typeof Store; label: string; sub: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <div><div className="text-sm font-medium">{label}</div><div className="text-[11px] text-muted-foreground">{sub}</div></div>
    </Link>
  );
}
