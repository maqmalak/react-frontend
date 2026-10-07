import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import toast from "react-hot-toast";
import {
  AlertTriangle, BookOpen, Boxes, Building2, CalendarCheck, ChevronRight, ClipboardList, FileText, Globe, HandCoins, Inbox, ListTodo, Receipt, RefreshCw,
  ShoppingCart, Target, Truck, type LucideIcon,
} from "lucide-react";
import { APPS, APP_GROUPS, type AppTile } from "@/app/apps";
import { APP_NAVIGATION, appSegmentForPath } from "@/app/navigation";
import { docUrl } from "@/app/doc-routes";
import { Logo } from "@/components/common/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useInstalledApps } from "@/hooks/useInstalledApps";
import { useVisibleModules } from "@/hooks/useWorkspaces";
import { isoDaysAgo } from "@/hooks/useUrlFlag";
import { SystemStatusCard } from "./system-status";
import { COMPANY } from "@/pages/Website/website-data";
import { humanizeError, postCall } from "@/services/frappe";
import { cn } from "@/utils/cn";
import { compactNumber, formatMoney } from "@/utils/currency";
import { APP_TIME_ZONE } from "@/utils/dates";

// ------------------------------------------------------------------ data (mm_core.home.get_home)
interface Alert { key: string; n: number; label: string; meta: string; to: string; tone: string; amount?: number | null }
interface Approval { doctype: string; name: string; state: string; amount?: number | null; title?: string; since: string; can_approve: boolean }
interface Activity { doctype: string; name: string; category: string; title: string; amount?: number | null; status: string; owner: string; owner_name: string; at: string }
interface HomeData {
  company: string; alerts: Alert[]; approvals: Approval[]; activity: Activity[];
  hours: number[]; days?: { date: string; count: number }[]; todos?: { open: number; overdue: number };
  cheques?: { count: number; amount: number; oldest?: string | null } | null; mix: Record<string, number>; stats: { entries_today: number; pending: number; posted_today: number };
  tiles: Record<string, { value: number; label: string }>;
}

/** Tailwind classes per tone (text / soft background / bar). */
const TONE: Record<string, { text: string; soft: string; bar: string }> = {
  green: { text: "text-emerald-600 dark:text-emerald-400", soft: "bg-emerald-500/10", bar: "bg-emerald-500" },
  amber: { text: "text-amber-600 dark:text-amber-400", soft: "bg-amber-500/10", bar: "bg-amber-500" },
  red: { text: "text-red-600 dark:text-red-400", soft: "bg-red-500/10", bar: "bg-red-500" },
  rose: { text: "text-rose-600 dark:text-rose-400", soft: "bg-rose-500/10", bar: "bg-rose-500" },
  lime: { text: "text-lime-600 dark:text-lime-400", soft: "bg-lime-500/10", bar: "bg-lime-500" },
  teal: { text: "text-teal-600 dark:text-teal-400", soft: "bg-teal-500/10", bar: "bg-teal-500" },
  orange: { text: "text-orange-600 dark:text-orange-400", soft: "bg-orange-500/10", bar: "bg-orange-500" },
  yellow: { text: "text-yellow-600 dark:text-yellow-400", soft: "bg-yellow-500/10", bar: "bg-yellow-500" },
  sky: { text: "text-sky-600 dark:text-sky-400", soft: "bg-sky-500/10", bar: "bg-sky-500" },
  violet: { text: "text-violet-600 dark:text-violet-400", soft: "bg-violet-500/10", bar: "bg-violet-500" },
  slate: { text: "text-slate-600 dark:text-slate-300", soft: "bg-slate-500/10", bar: "bg-slate-500" },
};
const tone = (t: string) => TONE[t] ?? TONE.slate;

const CATEGORY: Record<string, { label: string; tone: string }> = {
  finance: { label: "Finance", tone: "red" },
  ops: { label: "Operations", tone: "teal" },
  crm: { label: "CRM", tone: "rose" },
  hr: { label: "HR", tone: "violet" },
};

/** Quick links open each document's list (not a blank form). */
const QUICK: { label: string; to: string; icon: LucideIcon; tone: string }[] = [
  { label: "Sales Invoices", to: "/selling/sales-invoices", icon: Receipt, tone: "green" },
  { label: "Purchase Orders", to: "/import/purchase-orders", icon: ShoppingCart, tone: "yellow" },
  { label: "Journal Entries", to: "/accounting/journal-entries", icon: BookOpen, tone: "red" },
  { label: "Payment Entries", to: "/accounting/payment-entries", icon: HandCoins, tone: "lime" },
  { label: "Stock Entries", to: "/inventory/stock-entries", icon: Boxes, tone: "teal" },
  { label: "Delivery Notes", to: "/selling/delivery-notes", icon: Truck, tone: "sky" },
  { label: "Leads", to: "/crm/leads", icon: Target, tone: "rose" },
  { label: "Attendance", to: "/hr/attendance", icon: CalendarCheck, tone: "violet" },
  { label: "General Ledger", to: "/accounting/reports/general-ledger", icon: FileText, tone: "red" },
  { label: "Stock Ledger", to: "/inventory/reports/stock-ledger", icon: ClipboardList, tone: "teal" },
];

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function ago(iso: string): string {
  const t = new Date(iso.replace(" ", "T")).getTime();
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m}m`;
  if (m < 24 * 60) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

function dayLabel(iso: string): string {
  const d = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return d === today ? "Today" : d === yest ? "Yesterday" : "Earlier";
}

/** A document link: React route when the app has a page for it, the Frappe desk otherwise (a full page load). */
function DocLink({ doctype, name, className, children }: { doctype: string; name: string; className?: string; children: React.ReactNode }) {
  const u = docUrl(doctype, name);
  return u.external ? <a href={u.href} className={className}>{children}</a> : <Link to={u.href} className={className}>{children}</Link>;
}

/** Attention links: React list pages, or the Frappe desk (/app/...) for screens the app doesn't have. */
function AlertLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  return to.startsWith("/app/") || to.startsWith("/desk/") ? <a href={to} className={className}>{children}</a> : <Link to={to} className={className}>{children}</Link>;
}

const money = (v?: number | null) => (v ? formatMoney(v, undefined, { compact: true }) : "");

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>
      {count !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{count}</span>}
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

// ------------------------------------------------------------------ page
/** Post-login home: KPIs, things needing attention, quick links, app launcher and a live activity panel. */
export function DesktopPage() {
  const { user, currentUser, hasRole } = useAuth();
  const { company } = useCompanyContext();
  const name = user?.full_name || currentUser || "there";
  const { modules: visibleModules, isLoading: modulesLoading } = useVisibleModules();
  const { isAvailable, isPathAvailable } = useInstalledApps();
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<string>("all");

  const { data, isLoading, isValidating, mutate } = useFrappeGetCall<{ message: HomeData }>(
    "mm_core.home.get_home",
    { company: company ?? "", refresh: refresh ? 1 : 0 },
    `mm_core.home.${company ?? ""}.${refresh}`,
    { revalidateOnFocus: true, dedupingInterval: 60_000 },
  );
  const home = (data as unknown as { message?: HomeData })?.message;

  // App tiles: same visibility rules as before (roles, installed backend apps, enabled modules).
  const apps = useMemo(
    () =>
      APPS.filter((app) => {
        if (app.roles && app.roles.length > 0 && !hasRole(...app.roles)) return false;
        if (!isAvailable(app)) return false;
        if (!app.module || modulesLoading) return true;
        return app.module.some((m) => visibleModules.has(m));
      }),
    [hasRole, isAvailable, modulesLoading, visibleModules],
  );
  const sections = [...APP_GROUPS, "More"]
    .map((group) => ({ group, label: GROUP_LABEL[group] ?? group, items: apps.filter((a) => !HOME_HIDDEN.has(a.id) && (HOME_GROUP[a.id] ?? a.group ?? "More") === group) }))
    .filter((s) => s.items.length > 0);
  const overview = sections.find((s) => s.group === "Overview");
  const rest = sections.filter((s) => s !== overview);
  const quick = QUICK.filter((q) => isPathAvailable(q.to));

  const pending = home?.approvals.length ?? 0;
  const subtitle = !home
    ? "Loading your day…"
    : pending
      ? `${pending} document${pending === 1 ? " is" : "s are"} waiting for your approval.`
      : home.alerts.length
        ? `${home.alerts.length} thing${home.alerts.length === 1 ? " needs" : "s need"} attention today.`
        : "Everything is up to date.";

  return (
    <div className="flex flex-wrap items-start gap-6">
      <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-6">
        {/* greeting */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo variant="mark" className="h-10 w-auto shrink-0" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{greeting()}, {name.split(" ")[0]}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            <Button variant="outline" size="sm" onClick={() => { setRefresh((r) => r + 1); void mutate(); }} disabled={isValidating}>
              <RefreshCw className={cn("h-3.5 w-3.5", isValidating && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {/* overview apps first: dashboards and reports */}
        {overview && <AppSection {...overview} tiles={home?.tiles} extra={<>{hasRole("System Manager") && <SystemStatusCard />}<CompanyProfileCard /></>}
          oneRow={overview.items.length + (hasRole("System Manager") ? 2 : 1)} />}

        {/* needs attention */}
        {home && home.alerts.length > 0 && (
          <div>
            <SectionTitle count={home.alerts.length}>Needs attention</SectionTitle>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
              {home.alerts.map((a) => (
                <AlertLink key={a.key} to={a.to} className={cn("group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40", tone(a.tone).soft)}>
                  <span className={cn("min-w-[2.25rem] text-2xl font-semibold tabular-nums", tone(a.tone).text)}>{a.n > 999 ? compactNumber(a.n) : a.n}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{a.amount ? `${money(a.amount)} · ` : ""}{a.meta}</span>
                  </span>
                </AlertLink>
              ))}
            </div>
          </div>
        )}

        {/* quick links */}
        {quick.length > 0 && (
          <div>
            <SectionTitle>Quick links</SectionTitle>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
              {quick.map((q) => (
                <Link key={q.to} to={q.to} className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/50">
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tone(q.tone).soft, tone(q.tone).text)}>
                    <q.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* apps */}
        {rest.map((sec) => {
          const cols = SECTION_COLUMNS[sec.group];
          return <AppSection key={sec.group} {...sec} tiles={home?.tiles} oneRow={cols === "all" ? sec.items.length : cols} />;
        })}
      </main>

      <ActivityPanel home={home} loading={isLoading && !home} tab={tab} setTab={setTab} onChanged={() => { setRefresh((r) => r + 1); void mutate(); }} />
    </div>
  );
}

/** Overview card: the company's public website (home page at /). */
function CompanyProfileCard() {
  return (
    <Link to="/" className="group flex h-[76px] w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-emerald-500/[0.07] via-card to-teal-500/[0.07] p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Building2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">Company Profile</span>
        <span className="block truncate text-[10px] leading-tight text-muted-foreground">Website Home</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{COMPANY.legalName}</span>
      </span>
      <Globe className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:scale-110" />
    </Link>
  );
}

/** A small link tile in the activity panel header (to-dos, approvals). */
function PanelTile({ to, icon: Icon, tone, title, label, count, sub, warn, warnTone }: {
  to: string; icon: LucideIcon; tone: "violet" | "amber" | "sky"; title: string; label: string; count: number; sub: string;
  warn: boolean; warnTone: "rose" | "amber" | "sky";
}) {
  const iconTone = { violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400", amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400" }[tone];
  const subTone = { rose: "text-rose-600 dark:text-rose-400", amber: "text-amber-600 dark:text-amber-400", sky: "text-sky-600 dark:text-sky-400" }[warnTone];
  return (
    <Link to={to} title={title}
      className="group flex min-w-0 items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 transition-colors hover:border-primary/40 hover:bg-muted/40">
      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", iconTone)}><Icon className="h-3.5 w-3.5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium">{label} <span className="tabular-nums text-muted-foreground">{count}</span></span>
        <span className={cn("block truncate text-[10px]", warn ? subTone : "text-muted-foreground")}>{sub}</span>
      </span>
    </Link>
  );
}

/** Home page only: cards not shown here (still reachable from the menu), and cards shown in another section. */
const HOME_HIDDEN = new Set(["account", "pos", "analytics"]);
/** Cards per row for these sections ("all" = the whole section on one line); others wrap at 248px. */
const SECTION_COLUMNS: Record<string, number | "all"> = {
  "Finance & Setup": "all",
  Operations: 4,
  "Customers & Collaboration": "all",
};
const HOME_GROUP: Record<string, string> = { admin: "Finance & Setup", settings: "Finance & Setup" };
const GROUP_LABEL: Record<string, string> = { "Finance & Setup": "Accounts & Settings" };

function AppSection({ label, items, tiles, extra, oneRow }: { label: string; items: AppTile[]; tiles?: HomeData["tiles"]; extra?: React.ReactNode; oneRow?: number }) {
  return (
    <div>
      <SectionTitle count={items.length}>{label}</SectionTitle>
      {/* Fixed-size cards in regular rows (248px columns). `oneRow`: that many cards per line — up to 248px each,
          narrower on a small screen instead of wrapping early (Overview, Accounts & Settings, Operations…). */}
      <div className={cn("grid gap-2.5", !oneRow && "grid-cols-[repeat(auto-fill,248px)]")}
        style={oneRow ? { gridTemplateColumns: `repeat(${oneRow}, minmax(0, 248px))` } : undefined}>
        {items.map((app) => <AppTileCard key={app.id} app={app} stat={tiles?.[app.id]} />)}
        {extra}
      </div>
    </div>
  );
}

/** Each module's usual flow, shown as numbered steps when hovering its card. Others use their sidebar links. */
const PLAYBOOKS: Record<string, { title: string; steps: { label: string; to: string }[] }> = {
  dashboard: { title: "Executive Summary first", steps: [
    { label: "Executive Summary", to: "/dashboard" }, { label: "Accounts", to: "/analytics/accounts" },
    { label: "Sales", to: "/analytics/suite/sales" }, { label: "Buying", to: "/analytics/suite/purchase" },
    { label: "Stock", to: "/analytics/stock" }, { label: "HR", to: "/analytics/hr" },
    { label: "Financial Statements", to: "/analytics/financials" }] },
  selling: { title: "Order to cash", steps: [
    { label: "Quotation", to: "/selling/quotations" }, { label: "Sales Order", to: "/selling/sales-orders" },
    { label: "Delivery Note", to: "/selling/delivery-notes" }, { label: "Sales Invoice", to: "/selling/sales-invoices" },
    { label: "Receive payment", to: "/accounting/payment-entries" }] },
  purchase: { title: "Procure to pay", steps: [
    { label: "Material Request", to: "/import/material-requests" }, { label: "Request for Quotation", to: "/import/rfqs" },
    { label: "Purchase Order", to: "/import/purchase-orders" }, { label: "Purchase Receipt", to: "/purchase/receipts" },
    { label: "Purchase Invoice", to: "/purchase/invoices" }, { label: "Pay supplier", to: "/accounting/payment-entries" }] },
  accounting: { title: "Record to report", steps: [
    { label: "Journal Entries", to: "/accounting/journal-entries" }, { label: "Payment Entries", to: "/accounting/payment-entries" },
    { label: "General Ledger", to: "/accounting/reports/general-ledger" }, { label: "Trial Balance", to: "/accounting/reports/trial-balance" },
    { label: "Profit and Loss", to: "/accounting/reports/profit-and-loss" }, { label: "Balance Sheet", to: "/accounting/reports/balance-sheet" }] },
  stock: { title: "Inventory flow", steps: [
    { label: "Items", to: "/masters/items" }, { label: "Stock Entries", to: "/inventory/stock-entries" },
    { label: "Stock levels", to: "/inventory/stock" }, { label: "Stock Ledger", to: "/inventory/reports/stock-ledger" }] },
  crm: { title: "Lead to deal", steps: [
    { label: "Leads", to: "/crm/leads" }, { label: "Follow-ups", to: "/crm/follow-ups" }, { label: "Tasks", to: "/crm/tasks" }] },
};

function playbookFor(app: AppTile, isPathAvailable: (to: string) => boolean) {
  const curated = PLAYBOOKS[app.id];
  if (curated) return { title: curated.title, steps: curated.steps.filter((s) => isPathAvailable(s.to)) };
  // Fallback: the module's own sidebar links (first group's items first), de-duplicated.
  const nav = APP_NAVIGATION[appSegmentForPath(app.to)] ?? [];
  const seen = new Set<string>();
  const steps = nav.flatMap((g) => g.items).filter((i) => i.to !== app.to && isPathAvailable(i.to) && !seen.has(i.to) && seen.add(i.to))
    .slice(0, 6).map((i) => ({ label: i.label, to: i.to }));
  return { title: app.tagline ?? app.label, steps };
}

function AppTileCard({ app, stat }: { app: AppTile; stat?: { value: number; label: string } }) {
  const { isPathAvailable } = useInstalledApps();
  const playbook = playbookFor(app, isPathAvailable);
  return (
    <div className="group/tile relative">
    <Link to={app.to} className="group flex h-[76px] w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", app.colorClass)}>
        <app.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{app.label}</span>
        {app.tagline && <span className="block truncate text-[10px] leading-tight text-muted-foreground">{app.tagline}</span>}
        {stat && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{stat.value > 9999 ? compactNumber(stat.value) : stat.value.toLocaleString()}</span> {stat.label}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
    {playbook.steps.length > 0 && (
      // Playbook: appears on hover / keyboard focus, stays while the pointer is over it.
      <div className="invisible absolute left-0 top-full z-30 w-72 pt-1.5 opacity-0 transition-all delay-150 duration-150 group-hover/tile:visible group-hover/tile:opacity-100 group-focus-within/tile:visible group-focus-within/tile:opacity-100">
        <div className="rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl">
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", app.colorClass)}><app.icon className="h-3.5 w-3.5" /></span>
            <span className="text-xs font-semibold">{app.label} playbook</span>
            <span className="ml-auto truncate text-[10px] text-muted-foreground">{playbook.title}</span>
          </div>
          <ol className="space-y-0.5">
            {playbook.steps.map((st, i) => (
              <li key={st.to}>
                <Link to={st.to} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm hover:bg-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{st.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    )}
    </div>
  );
}

// ------------------------------------------------------------------ right panel
function ActivityPanel({ home, loading, tab, setTab, onChanged }: { home?: HomeData; loading: boolean; tab: string; setTab: (t: string) => void; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) return <aside className="w-full flex-[1_1_340px] xl:max-w-[400px]"><Skeleton className="h-[540px] rounded-xl" /></aside>;
  if (!home) return null;

  // The last 7 days, today last.
  const week = home.days ?? [];
  const todayIso = isoDaysAgo(0);
  const peak = Math.max(...week.map((d) => d.count), 0);
  const peakDay = peak ? week.find((d) => d.count === peak) : undefined;
  const dayName = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
  const weekTotal = week.reduce((a, d) => a + d.count, 0);
  const mixTotal = Object.values(home.mix).reduce((s, v) => s + v, 0);
  const cats = Object.keys(CATEGORY).filter((c) => home.activity.some((a) => a.category === c));
  const tabs = [{ key: "all", label: "All" }, ...(home.approvals.length ? [{ key: "approvals", label: `Approvals · ${home.approvals.length}` }] : []), ...cats.map((c) => ({ key: c, label: CATEGORY[c].label }))];

  const approve = async (a: Approval) => {
    setBusy(a.name);
    try {
      await postCall("mm_core.home.approve", { doctype: a.doctype, name: a.name });
      toast.success(`${a.name} approved`);
      onChanged();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  const feed = tab === "approvals" ? [] : home.activity.filter((a) => tab === "all" || a.category === tab);
  const days = ["Today", "Yesterday", "Earlier"]
    .map((label) => ({ label, items: feed.filter((a) => dayLabel(a.at) === label) }))
    .filter((d) => d.items.length);

  return (
    <aside className="w-full flex-[1_1_340px] xl:sticky xl:top-20 xl:max-w-[400px]">
      <Card className="space-y-4 p-4">
        <div className="space-y-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent activity</h2>
          {/* To-dos + approvals: their own row of equal tiles, so nothing overlaps in the narrow panel */}
          <div className="grid grid-cols-2 gap-2">
            <PanelTile to={home.todos?.overdue ? "/todos?overdue=1" : "/todos"} icon={ListTodo} tone="violet" title="Your open to-dos"
              label="To-dos" count={home.todos?.open ?? 0}
              sub={home.todos?.overdue ? `${home.todos.overdue} overdue` : "none overdue"} warn={Boolean(home.todos?.overdue)} warnTone="rose" />
            <PanelTile to="/approvals/inbox" icon={Inbox} tone="amber" title="Workflow and HR requests waiting for you"
              label="Approvals" count={home.approvals.length}
              sub={home.approvals.length ? "waiting for you" : "all clear"} warn={home.approvals.length > 0} warnTone="amber" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { v: String(home.stats.entries_today), l: "Entries today" },
            { v: String(home.stats.pending), l: "Pending", c: home.stats.pending ? "text-amber-600 dark:text-amber-400" : "" },
            { v: money(home.stats.posted_today) || "0", l: "Posted today", c: "text-primary" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-muted/50 p-2 text-center">
              <div className={cn("text-base font-semibold tabular-nums", s.c)}>{s.v}</div>
              <div className="text-[10px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>Entries per day, last 7 days</span>
            <span>{weekTotal ? `${weekTotal} total${peakDay ? ` · peak ${dayName(peakDay.date)}` : ""}` : "None yet"}</span>
          </div>
          <div className="flex h-12 items-end gap-1.5">
            {week.map((d) => (
              <span
                key={d.date}
                title={`${dayName(d.date)} ${d.date} · ${d.count}`}
                className={cn("flex-1 rounded-sm bg-primary", d.date === todayIso || (d.count === peak && peak) ? "opacity-100" : "opacity-40")}
                style={{ height: `${peak ? Math.max(6, (d.count / peak) * 100) : 6}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-[10px] text-muted-foreground">
            {week.map((d) => (
              <span key={d.date} className={cn("flex-1 text-center", d.date === todayIso && "font-semibold text-foreground")}>{dayName(d.date)}</span>
            ))}
          </div>
        </div>

        {mixTotal > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] text-muted-foreground">Share by module, today</div>
            <div className="flex h-2 overflow-hidden rounded-full">
              {Object.entries(home.mix).map(([c, n]) => <span key={c} className={tone(CATEGORY[c]?.tone ?? "slate").bar} style={{ width: `${(n / mixTotal) * 100}%` }} />)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {Object.entries(home.mix).map(([c, n]) => (
                <span key={c} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", tone(CATEGORY[c]?.tone ?? "slate").bar)} />
                  {CATEGORY[c]?.label ?? c} <span className="text-muted-foreground">{Math.round((n / mixTotal) * 100)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors", tab === t.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
          {(tab === "all" || tab === "approvals") && home.approvals.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Waiting for you</div>
              {home.approvals.map((a) => (
                <div key={`${a.doctype}-${a.name}`} className="rounded-lg p-2 hover:bg-muted/50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium" title={`${a.doctype} ${a.name}`}>{a.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{a.doctype}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span className="rounded bg-amber-500/10 px-1.5 text-amber-600 dark:text-amber-400">{a.state}</span>
                        {a.title && <span className="truncate">{a.title}</span>}
                        {a.amount ? <span>{money(a.amount)}</span> : null}
                        <span>{ago(a.since)}</span>
                      </div>
                      <div className="mt-1.5 flex gap-1.5">
                        {a.can_approve && (
                          <Button size="sm" className="h-7 px-2.5 text-xs" disabled={busy === a.name} onClick={() => void approve(a)}>Approve</Button>
                        )}
                        <DocLink doctype={a.doctype} name={a.name} className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs hover:bg-muted">Review</DocLink>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {days.map((d) => (
            <div key={d.label}>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d.label}</div>
              {d.items.map((a) => {
                const cat = CATEGORY[a.category] ?? { label: a.category, tone: "slate" };
                return (
                  <DocLink key={`${a.doctype}-${a.name}`} doctype={a.doctype} name={a.name} className="flex items-start gap-2 rounded-lg p-2 hover:bg-muted/50">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone(cat.tone).bar)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-medium" title={`${a.doctype} ${a.name}`}>{a.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{ago(a.at)}</span>
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground" title={a.title || undefined}>
                        {a.doctype}{a.title ? ` · ${a.title}` : ""}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className={cn("rounded px-1.5", tone(cat.tone).soft, tone(cat.tone).text)}>{a.status}</span>
                        {a.amount ? <span>{money(a.amount)}</span> : null}
                        <Avatar name={a.owner_name} size="sm" className="!h-4 !w-4 !text-[8px]" />
                        <span className="truncate">{a.owner_name}</span>
                      </span>
                    </span>
                  </DocLink>
                );
              })}
            </div>
          ))}

          {!home.approvals.length && !days.length && <p className="py-6 text-center text-sm text-muted-foreground">No activity in the last 7 days.</p>}
        </div>
      </Card>
    </aside>
  );
}
