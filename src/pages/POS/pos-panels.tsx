/** POS terminal panels: invoice manager (with receipt preview / reprint / return), returns, sync status, collecting dues. */
import { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import toast from "react-hot-toast";
import {
  AlertTriangle, CheckCircle2, CloudOff, Database, FileText, HandCoins, Loader2, PauseCircle, PlayCircle, Printer, RefreshCw, Search, Trash2, Undo2, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getCall, humanizeError, postCall } from "@/services/frappe";
import { cn } from "@/utils/cn";
import { kvGet, localDate, type CompanyHeader, type OfflineBundle, type ReceiptData, type SyncState } from "./pos-offline";
import { loadPrinter, paymentReceiptHtml, printHtml, printReceipt, receiptHtml, ReceiptPreview } from "./pos-receipt";

type Money = (v?: number) => string;
interface PanelProfile { name: string; company: string; print_format?: string; payments: { mode_of_payment: string; default: number }[] }

export const printUrl = (name: string, format?: string) =>
  `/printview?doctype=POS%20Invoice&name=${encodeURIComponent(name)}${format ? `&format=${encodeURIComponent(format)}` : ""}&trigger_print=1`;

// ------------------------------------------------------------------ invoice manager
interface InvRow { name: string; customer: string; customer_name: string; posting_date: string; posting_time: string; grand_total: number; paid_amount: number; due: number;
  is_return: number; return_against?: string; status: string; docstatus: number; consolidated_invoice?: string; cashier: string; mm_offline_id?: string; coupon_code?: string; remarks?: string }
const TABS = [["all", "All"], ["paid", "Paid"], ["credit", "Credit / due"], ["return", "Returns"], ["held", "Held"], ["offline", "Synced offline"], ["consolidated", "Consolidated"], ["cancelled", "Cancelled"]] as const;

export function InvoicesDialog({ profile, money, online, onClose, onResume }: { profile: PanelProfile; money: Money; online: boolean; onClose: () => void; onResume: (name: string) => void }) {
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState(localDate());
  const [to, setTo] = useState(localDate());
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [limit, setLimit] = useState(50);
  const [view, setView] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const { data, mutate, isLoading } = useFrappeGetCall<{ message: { rows: InvRow[]; count: number; amount: number; due: number } }>("mm_core.pos.invoices",
    online ? { pos_profile: profile.name, status, from_date: from, to_date: to, q, mine: mine ? 1 : 0, page_length: limit } : undefined,
    online ? `pos.inv.${profile.name}.${status}.${from}.${to}.${q}.${mine}.${limit}` : null, { keepPreviousData: true });
  const res = data?.message;

  const remove = async (name: string) => {
    if (!window.confirm(`Delete held sale ${name}?`)) return;
    try { await postCall("mm_core.pos.delete_held", { name }); toast.success(`${name} deleted`); void mutate(); } catch (e) { toast.error(humanizeError(e)); }
  };

  if (returning) return <ReturnDialog name={returning} profile={profile} money={money} onClose={() => setReturning(null)} onDone={() => { setReturning(null); void mutate(); }} />;
  if (view) return <InvoiceView name={view} profile={profile} money={money} onBack={() => setView(null)} onReturn={(n) => { setView(null); setReturning(n); }} />;

  return (
    <Dialog open onClose={onClose} title="Invoices" description="Every sale of this counter — reprint, return, resume or delete held sales." size="xl">
      {!online ? <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><CloudOff className="h-4 w-4" /> The invoice list needs the server. Offline sales are under Sync status.</p> : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">{TABS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setStatus(k)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", status === k ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice no, customer, offline id…" className="pl-8" /></div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Mine only</label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-muted/50 p-2"><div className="text-[11px] text-muted-foreground">Invoices</div><div className="font-semibold">{res?.count ?? "—"}</div></div>
            <div className="rounded-lg bg-muted/50 p-2"><div className="text-[11px] text-muted-foreground">Total</div><div className="font-semibold tabular-nums">{money(res?.amount)}</div></div>
            <div className="rounded-lg bg-muted/50 p-2"><div className="text-[11px] text-muted-foreground">Balance due</div><div className={cn("font-semibold tabular-nums", (res?.due ?? 0) > 0 && "text-rose-600")}>{money(res?.due)}</div></div>
          </div>
          <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground"><tr>
                <th className="px-2 py-1.5 text-left">Invoice</th><th className="text-left">Customer</th><th className="text-left">When</th><th className="text-right">Total</th><th className="text-right">Due</th><th className="text-left">Status</th><th /></tr></thead>
              <tbody>
                {isLoading && !res ? <tr><td colSpan={7} className="p-3"><Skeleton className="h-24" /></td></tr> : (res?.rows ?? []).map((r) => (
                  <tr key={r.name} className="border-t border-border hover:bg-muted/40">
                    <td className="px-2 py-1.5"><button type="button" className="font-medium hover:underline" onClick={() => setView(r.name)}>{r.name}</button>
                      <div className="flex gap-1 text-[10px]">{r.is_return ? <span className="rounded bg-rose-500/10 px-1 text-rose-600">Return</span> : null}
                        {r.mm_offline_id ? <span className="rounded bg-sky-500/10 px-1 text-sky-600">Offline</span> : null}{r.coupon_code ? <span className="rounded bg-violet-500/10 px-1 text-violet-600">{r.coupon_code}</span> : null}</div></td>
                    <td className="max-w-[160px] truncate">{r.customer_name}</td>
                    <td className="text-xs text-muted-foreground">{r.posting_date} {String(r.posting_time).slice(0, 5)}<div className="truncate">{r.cashier}</div></td>
                    <td className={cn("text-right tabular-nums", r.is_return && "text-rose-600")}>{money(r.grand_total)}</td>
                    <td className={cn("text-right tabular-nums", r.due > 0.01 && "font-medium text-rose-600")}>{r.due > 0.01 ? money(r.due) : "—"}</td>
                    <td className="text-xs">{r.docstatus === 0 ? "Held" : r.status}</td>
                    <td className="whitespace-nowrap px-2 text-right">
                      {r.docstatus === 0 ? (<>
                        <Button size="sm" variant="ghost" onClick={() => onResume(r.name)} title="Resume"><PlayCircle className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => void remove(r.name)} title="Delete"><Trash2 className="h-4 w-4" /></Button></>
                      ) : r.docstatus === 1 ? (<>
                        <Button size="sm" variant="ghost" onClick={() => void reprint(r.name)} title="Reprint receipt"><Printer className="h-4 w-4" /></Button>
                        {!r.is_return && <Button size="sm" variant="ghost" onClick={() => setReturning(r.name)} title="Return"><Undo2 className="h-4 w-4" /></Button>}</>
                      ) : null}
                    </td>
                  </tr>))}
                {res && res.rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No invoices.</td></tr>}
              </tbody>
            </table>
          </div>
          {res && res.rows.length < res.count && <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 50)}>Load more ({res.count - res.rows.length})</Button>}
        </div>
      )}
    </Dialog>
  );
}

async function reprint(name: string) {
  try { printReceipt(await getCall<ReceiptData>("mm_core.pos.receipt", { name }), loadPrinter(), true); } catch (e) { toast.error(humanizeError(e)); }
}

function InvoiceView({ name, profile, money, onBack, onReturn }: { name: string; profile: PanelProfile; money: Money; onBack: () => void; onReturn: (n: string) => void }) {
  const { data } = useFrappeGetCall<{ message: ReceiptData & { docstatus: number } }>("mm_core.pos.receipt", { name }, `pos.receipt.${name}`);
  const r = data?.message;
  return (
    <Dialog open onClose={onBack} title={name} description={r ? `${r.customer_name} · ${r.posting_date} ${r.posting_time.slice(0, 5)} · ${r.cashier}` : undefined} size="lg">
      {!r ? <Skeleton className="h-80" /> : (
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <ReceiptPreview html={receiptHtml(r, { ...loadPrinter(), paper: "80" })} />
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-[11px] text-muted-foreground">Total</div><div className="text-2xl font-bold tabular-nums">{money(r.rounded_total || r.grand_total)}</div>
              {(r.outstanding_amount ?? 0) > 0.01 && <div className="text-xs font-medium text-rose-600">Due {money(r.outstanding_amount)}</div>}</div>
            <Button className="w-full" onClick={() => printReceipt(r, loadPrinter(), true)}><Printer className="h-4 w-4" /> Reprint (thermal)</Button>
            <Button variant="outline" className="w-full" onClick={() => window.open(printUrl(name, profile.print_format), "_blank")}><FileText className="h-4 w-4" /> A4 print format</Button>
            {r.docstatus === 1 && !r.is_return && <Button variant="outline" className="w-full" onClick={() => onReturn(name)}><Undo2 className="h-4 w-4" /> Return items</Button>}
            {r.offline_id && <p className="text-[11px] text-muted-foreground">Rung up offline · {r.offline_id.slice(0, 8)}</p>}
            <Button variant="ghost" className="w-full" onClick={onBack}>Back to list</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ------------------------------------------------------------------ returns
interface Returnable { name: string; customer_name: string; posting_date: string; payments: string[]; items: { name: string; item_code: string; item_name: string; qty: number; uom: string; rate: number; returnable: number }[] }

export function ReturnDialog({ name, profile, money, onClose, onDone }: { name: string; profile: PanelProfile; money: Money; onClose: () => void; onDone: () => void }) {
  const { data } = useFrappeGetCall<{ message: Returnable }>("mm_core.pos.returnable_items", { name }, `pos.returnable.${name}`);
  const inv = data?.message;
  const [qty, setQty] = useState<Record<string, number>>({});
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!inv) return;
    setQty(Object.fromEntries(inv.items.map((i) => [i.name, i.returnable])));
    setMode(inv.payments[0] ?? profile.payments[0]?.mode_of_payment ?? "");
  }, [inv, profile.payments]);
  const refund = (inv?.items ?? []).reduce((s, i) => s + (qty[i.name] ?? 0) * i.rate, 0);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await postCall<{ name: string; grand_total: number }>("mm_core.pos.return_invoice", { name, items: JSON.stringify(qty), mode_of_payment: mode });
      toast.success(`Returned as ${r.name} — refund ${money(Math.abs(r.grand_total))}`);
      const settings = loadPrinter();
      if (settings.autoPrint) void getCall<ReceiptData>("mm_core.pos.receipt", { name: r.name }).then((rc) => printReceipt(rc, settings));
      onDone();
    } catch (e) { toast.error(humanizeError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={`Return ${name}`} description={inv ? `${inv.customer_name} · ${inv.posting_date}` : undefined} size="lg">
      {!inv ? <Skeleton className="h-40" /> : (
        <div className="space-y-4">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="text-left">Item</th><th className="text-right">Sold</th><th className="text-right">Returnable</th><th className="text-right">Rate</th><th className="text-right">Return qty</th></tr></thead>
            <tbody>{inv.items.map((i) => (
              <tr key={i.name} className="border-t border-border">
                <td className="py-2"><div className="font-medium">{i.item_name}</div><div className="text-[11px] text-muted-foreground">{i.item_code}</div></td>
                <td className="text-right tabular-nums">{i.qty} {i.uom}</td><td className="text-right tabular-nums">{i.returnable}</td><td className="text-right tabular-nums">{money(i.rate)}</td>
                <td className="text-right"><Input type="number" min={0} max={i.returnable} disabled={i.returnable <= 0} value={qty[i.name] ?? 0} className="ml-auto h-8 w-24 text-right"
                  onChange={(e) => setQty((q) => ({ ...q, [i.name]: Math.max(0, Math.min(i.returnable, Number(e.target.value) || 0)) }))} aria-label={`Return qty ${i.item_name}`} /></td>
              </tr>))}</tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">Refund via
              <Select value={mode} onChange={(e) => setMode(e.target.value)} className="h-8 w-40">{profile.payments.map((m) => <option key={m.mode_of_payment}>{m.mode_of_payment}</option>)}</Select></label>
            <span className="text-sm">Refund ≈ <b className="tabular-nums text-rose-600">{money(refund)}</b> <span className="text-[11px] text-muted-foreground">(before bill discount / tax)</span></span>
          </div>
          <Button className="w-full" disabled={busy || refund <= 0} onClick={() => void submit()}><Undo2 className="h-4 w-4" /> Process return</Button>
        </div>
      )}
    </Dialog>
  );
}

// ------------------------------------------------------------------ sync status
export function SyncDialog({ sync, profile, money, bundle, onRefreshBundle, onClose }: {
  sync: SyncState; profile: PanelProfile; money: Money; bundle?: OfflineBundle; onRefreshBundle: () => Promise<void>; onClose: () => void;
}) {
  const [synced, setSynced] = useState<{ offline_id: string; name: string; at: string; total: number; customer_name: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { void kvGet<typeof synced>("synced").then((s) => setSynced(s ?? [])); }, [sync.queue.length, sync.lastSync]);
  const failed = sync.queue.filter((q) => q.status === "failed").length;
  return (
    <Dialog open onClose={onClose} title="Sync status" description="Sales rung up offline are kept on this device and posted when the server is reachable." size="xl">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <Stat icon={sync.online ? Wifi : CloudOff} tone={sync.online ? "text-emerald-600" : "text-rose-600"} label="Connection" value={sync.online ? "Online" : "Offline"} />
          <Stat icon={PauseCircle} tone="text-amber-600" label="Waiting to sync" value={String(sync.queue.length - failed)} />
          <Stat icon={AlertTriangle} tone={failed ? "text-rose-600" : "text-muted-foreground"} label="Failed" value={String(failed)} />
          <Stat icon={CheckCircle2} tone="text-sky-600" label="Last sync" value={sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : "never"} />
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-xs text-muted-foreground">
          <Database className="h-4 w-4" />
          {bundle ? <>Offline data for <b className="text-foreground">{profile.name}</b>: {bundle.items.length} items, {bundle.customers.length} customers, {bundle.taxes.length} tax rows — cached {new Date(bundle.generated_at.replace(" ", "T")).toLocaleString()}</> : "No offline data cached yet."}
          <Button size="sm" variant="outline" className="ml-auto" disabled={!sync.online || refreshing} onClick={() => { setRefreshing(true); void onRefreshBundle().finally(() => setRefreshing(false)); }}>
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Refresh offline data</Button>
          <Button size="sm" disabled={!sync.online || sync.syncing || !sync.queue.length} onClick={() => void sync.sync()}>
            {sync.syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync now</Button>
        </div>
        {sync.lastError && <p className="rounded-md bg-rose-500/10 p-2 text-xs text-rose-600">{sync.lastError}</p>}
        <div>
          <h3 className="mb-1 text-sm font-semibold">On this device</h3>
          {sync.queue.length === 0 ? <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">Everything is synced.</p> : (
            <ul className="divide-y divide-border rounded-lg border border-border">{sync.queue.map((q) => (
              <li key={q.offline_id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                <span className={cn("h-2 w-2 rounded-full", q.status === "failed" ? "bg-rose-500" : "bg-amber-500")} />
                <div className="min-w-0 flex-1"><div className="font-medium">{q.customer_name} · {money(q.total)}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(q.created).toLocaleString()} · {q.offline_id.slice(0, 8)}{q.attempts ? ` · ${q.attempts} attempt(s)` : ""}</div>
                  {q.error && <div className="text-[11px] text-rose-600">{q.error}</div>}</div>
                <Button size="sm" variant="ghost" onClick={() => printReceipt(q.receipt, loadPrinter(), true)} title="Reprint"><Printer className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-rose-600" title="Discard"
                  onClick={() => { if (window.confirm("Discard this offline sale? It will never reach the server — refund or re-ring it.")) void sync.discard(q.offline_id); }}><Trash2 className="h-4 w-4" /></Button>
              </li>))}</ul>
          )}
        </div>
        {synced.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Recently synced</h3>
            <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">{synced.slice(0, 20).map((s) => (
              <li key={s.offline_id} className="flex items-center gap-2 p-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">{s.name}</span><span className="flex-1 truncate text-muted-foreground">{s.customer_name}</span>
                <span className="tabular-nums">{money(s.total)}</span><span className="text-[11px] text-muted-foreground">{new Date(s.at).toLocaleTimeString()}</span></li>))}</ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function Stat({ icon: Icon, tone, label, value }: { icon: typeof Wifi; tone: string; label: string; value: string }) {
  return <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2"><Icon className={cn("h-5 w-5", tone)} /><div><div className="text-[11px] text-muted-foreground">{label}</div><div className="text-sm font-semibold">{value}</div></div></div>;
}

// ------------------------------------------------------------------ collect customer dues
export function ReceiveDuesDialog({ customer, customerName, outstanding, profile, money, currency, cashier, company, onClose, onDone }: {
  customer: string; customerName: string; outstanding: number; profile: PanelProfile; money: Money; currency: string; cashier: string; company: CompanyHeader;
  onClose: () => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState(outstanding);
  const [mode, setMode] = useState(profile.payments.find((m) => m.default)?.mode_of_payment ?? profile.payments[0]?.mode_of_payment ?? "");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await postCall<{ name: string; allocated: number; unallocated: number }>("mm_core.pos.receive_payment", { customer, amount, mode_of_payment: mode, reference_no: ref || undefined });
      toast.success(`Payment ${r.name} received`);
      printHtml(paymentReceiptHtml({ name: r.name, customer: customerName, amount, mode, reference_no: ref, allocated: r.allocated, currency, cashier, company }, loadPrinter()));
      onDone();
    } catch (e) { toast.error(humanizeError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="Receive payment" description={`${customerName} owes ${money(outstanding)}. Allocated to the oldest open invoices.`} size="sm">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Amount</span><Input type="number" min={0} autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="text-right text-lg" /></label>
        <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Mode</span>
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>{profile.payments.map((m) => <option key={m.mode_of_payment}>{m.mode_of_payment}</option>)}</Select></label>
        {!/cash/i.test(mode) && <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Reference / slip no</span><Input value={ref} onChange={(e) => setRef(e.target.value)} /></label>}
        <p className="text-[11px] text-muted-foreground">Credit sales from an open shift become invoices once the shift closes; until then the amount stays on account.</p>
        <Button type="submit" className="w-full" disabled={busy || amount <= 0}><HandCoins className="h-4 w-4" /> Receive {money(amount)}</Button>
      </form>
    </Dialog>
  );
}
