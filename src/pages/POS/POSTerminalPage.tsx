import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";
import toast from "react-hot-toast";
import {
  Award, Banknote, CalendarClock, ChevronDown, CreditCard, Gift, History, Keyboard, LayoutDashboard, LayoutGrid, List, LogOut, MessageSquare,
  Minus, PauseCircle, Percent, Phone, Plus, Printer, Receipt, ScanBarcode, ShoppingBag, Store, Tag, Ticket, Trash2, User,
  UserPlus, Wallet, X, Landmark, Smartphone, SplitSquareHorizontal, CloudOff, Wifi, RefreshCw, HandCoins, FileText, Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getCall, humanizeError, postCall } from "@/services/frappe";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/currency";
import {
  consumeBundleStock, isNetworkError, kvGet, kvSet, loadBundle, localDate, localTime, localTotals, refreshBundle, registerPosServiceWorker,
  searchBundle, usePosSync, uuid, type OfflineBundle, type QueuedSale, type ReceiptData, type SyncState,
} from "./pos-offline";
import { loadPrinter, printHtml, printReceipt, PrinterSettingsDialog, shiftReportHtml, type ShiftReport } from "./pos-receipt";
import { InvoicesDialog, printUrl, ReceiveDuesDialog, SyncDialog } from "./pos-panels";

interface Profile {
  name: string; company: string; warehouse: string; price_list: string; currency: string; customer: string;
  allow_rate_change?: number; allow_discount_change?: number; print_format?: string; allow_partial_payment?: number; write_off_limit?: number;
  hide_unavailable_items?: number; hide_images?: number; auto_add_item_to_cart?: number; print_receipt_on_order_complete?: number;
  payments: { mode_of_payment: string; default: number }[]; item_groups: string[];
}
interface Ctx { profiles: { name: string; company: string }[]; shift: { name: string; pos_profile: string; period_start_date: string } | null; profile: Profile | null; cashier: string }
interface Item { item_code: string; item_name: string; price_list_rate: number; actual_qty: number; uom: string; stock_uom?: string; item_image?: string; is_stock_item?: number; batch_no?: string; serial_no?: string }
interface Line {
  key: string; item_code: string; item_name: string; qty: number; uom: string; price_list_rate: number; rate?: number;
  discount_percentage?: number; stock: number; batch_no?: string; serial_no?: string;
}
interface PreviewRow { item_code: string; item_name: string; qty: number; uom: string; rate: number; amount: number; price_list_rate: number; discount_percentage: number; pricing_rules?: string; is_free_item?: number }
interface Preview {
  net_total: number; total: number; discount_amount: number; total_taxes_and_charges: number; grand_total: number; rounded_total: number;
  additional_discount_percentage: number; items: PreviewRow[]; taxes: { description: string; tax_amount: number }[];
}
interface ItemOptions { item_code: string; stock_uom: string; has_batch_no: number; has_serial_no: number; uoms: { uom: string; conversion_factor: number }[];
  batches: { batch_no: string; qty: number; expiry_date?: string }[]; serials: string[]; actual_qty: number }
interface CustomerInfo { name: string; customer_name: string; mobile_no?: string; email_id?: string; customer_group?: string; outstanding: number; credit_limit: number;
  loyalty_program?: string; loyalty_points: number; conversion_factor?: number; tier_name?: string; last_purchase?: { name: string; posting_date: string; grand_total: number } }
interface Coupon { name: string; coupon_code: string; title?: string }
type Money = (v?: number) => string;

const unwrap = <T,>(r: unknown) => (r as { message?: T })?.message as T;
const initials = (s: string) => s.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const TINTS = ["from-sky-500 to-blue-600", "from-emerald-500 to-teal-600", "from-violet-500 to-indigo-600", "from-amber-500 to-orange-600", "from-rose-500 to-pink-600"];
const tint = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
const hasRules = (r?: string) => !!r && r !== "[]";
const today = () => new Date().toISOString().slice(0, 10);
const VIEW_KEY = "pos.view";
const readView = (): "grid" | "list" => { try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; } };

// item options (UOMs / batches / serials) are fetched once per item per session
const optionsCache = new Map<string, Promise<ItemOptions>>();
const itemOptions = (code: string, warehouse: string) => {
  const k = `${warehouse}|${code}`;
  if (!optionsCache.has(k)) optionsCache.set(k, getCall<ItemOptions>("mm_core.pos.item_options", { item_code: code, warehouse }));
  return optionsCache.get(k)!;
};

/**
 * /pos/terminal — the counter, modelled on POS Awesome: shift open / close with cash count, item grid or list with barcode,
 * batch and serial scan, UOM / batch / serial per line, ERPNext pricing rules and coupons, loyalty points, new customer from
 * the counter, multi-tender payment with change, credit sale and write-off, hold / resume, orders with full or partial returns.
 */
export default function POSTerminalPage() {
  const sync = usePosSync();
  const { data: ctxData, mutate: reloadCtx, isLoading, error: ctxError } = useFrappeGetCall<{ message: Ctx }>("mm_core.pos.get_context", undefined, "mm_core.pos.ctx",
    { shouldRetryOnError: false });
  const [cachedCtx, setCachedCtx] = useState<Ctx>();
  useEffect(() => { registerPosServiceWorker(); void kvGet<Ctx>("ctx").then(setCachedCtx); }, []);
  const liveCtx = unwrap<Ctx>(ctxData);
  useEffect(() => { if (liveCtx) void kvSet("ctx", liveCtx); }, [liveCtx]);
  useEffect(() => { if (ctxError && isNetworkError(ctxError)) sync.markOffline(); }, [ctxError, sync.markOffline]);
  const offline = !sync.online;
  const ctx = liveCtx ?? (offline || ctxError ? cachedCtx : undefined);
  const profile = ctx?.profile;
  const [bundle, setBundle] = useState<OfflineBundle>();
  const pullBundle = useCallback(async () => {
    if (!profile) return;
    try { setBundle(await refreshBundle(profile.name)); } catch (e) { if (isNetworkError(e)) sync.markOffline(); }
  }, [profile?.name, sync.markOffline]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile) return;
    void loadBundle(profile.name).then((b) => { if (b) setBundle(b); });
    if (sync.online) void pullBundle();
    const t = setInterval(() => { if (navigator.onLine) void pullBundle(); }, 10 * 60_000);
    return () => clearInterval(t);
  }, [profile?.name, sync.online, pullBundle]); // eslint-disable-line react-hooks/exhaustive-deps
  const money = useCallback((v?: number) => formatMoney(v ?? 0, profile?.currency ?? "PKR"), [profile?.currency]);

  const [group, setGroup] = useState("");
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [view, setView] = useState<"grid" | "list">(readView);
  useEffect(() => { const t = setTimeout(() => setDebounced(term.trim()), 220); return () => clearTimeout(t); }, [term]);
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* private mode */ } }, [view]);
  const { data: itemData, isLoading: itemsLoading } = useFrappeGetCall<{ message: { items: Item[] } }>(
    "erpnext.selling.page.point_of_sale.point_of_sale.get_items",
    profile && !offline ? { start: 0, page_length: 80, price_list: profile.price_list, item_group: group, pos_profile: profile.name, search_term: debounced } : undefined,
    profile && !offline ? `pos.items.${profile.name}.${group}.${debounced}` : null, { keepPreviousData: true });
  const allItems: Item[] = offline ? searchBundle(bundle, debounced, group) : unwrap<{ items: Item[] }>(itemData)?.items ?? [];
  const items = profile?.hide_unavailable_items ? allItems.filter((i) => !i.is_stock_item || i.actual_qty > 0) : allItems;
  const { data: offerData } = useFrappeGetCall<{ message: unknown[] }>("mm_core.pos.offers", profile && !offline ? { pos_profile: profile.name } : undefined, profile && !offline ? `pos.offers.${profile.name}` : null);
  const offerCount = (unwrap<unknown[]>(offerData) ?? []).length;

  const [lines, setLines] = useState<Line[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [customer, setCustomer] = useState("");
  const [discount, setDiscount] = useState(0);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [remarks, setRemarks] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pay, setPay] = useState(false);
  const [panel, setPanel] = useState<"held" | "orders" | "close" | "offers" | "customer" | "keys" | "sync" | "printer" | "dues" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (profile && !customer) setCustomer(profile.customer); }, [profile, customer]);
  const { data: custData, mutate: reloadCustomer } = useFrappeGetCall<{ message: CustomerInfo }>("mm_core.pos.customer_info",
    customer && profile && !offline ? { customer, company: profile.company } : undefined, customer && profile && !offline ? `pos.cust.${customer}` : null);
  const cust = unwrap<CustomerInfo>(custData);

  const add = async (it: Item) => {
    if (!profile) return;
    let batch = it.batch_no || undefined;
    const serial = it.serial_no || undefined;
    let needsSerial = false;
    if (!offline) try {
      const o = await itemOptions(it.item_code, profile.warehouse);
      if (o.has_batch_no && !batch) batch = o.batches[0]?.batch_no;          // first-expiry-first-out
      if (o.has_batch_no && !batch) { toast.error(`${it.item_name}: no batch in stock here`); return; }
      needsSerial = !!o.has_serial_no && !serial;
    } catch { /* options are a nicety; the server validates */ }
    const same = (l: Line) => l.item_code === it.item_code && l.batch_no === batch && !l.serial_no && !serial;
    if (!needsSerial && lines.some(same)) {
      setLines((ls) => ls.map((l) => (same(l) ? { ...l, qty: l.qty + 1 } : l)));
      return;
    }
    const key = `${it.item_code}-${Date.now()}`;
    setLines((ls) => [...ls, { key, item_code: it.item_code, item_name: it.item_name, qty: 1, uom: it.uom || it.stock_uom || "Nos", price_list_rate: it.price_list_rate,
      stock: it.actual_qty, batch_no: batch, serial_no: serial }]);
    if (needsSerial) { setOpen(key); toast("Pick the serial number(s)", { icon: "🔢" }); }
  };
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)).filter((l) => l.qty > 0));
  const clear = () => { setLines([]); setDiscount(0); setCoupon(null); setRemarks(""); setDraft(null); setPreview(null); setOpen(null); setCustomer(profile?.customer ?? ""); };

  const payload = useMemo(() => ({
    pos_profile: profile?.name, customer, discount_percentage: discount, coupon_code: coupon?.name, remarks: remarks || undefined,
    items: lines.map((l) => ({ item_code: l.item_code, qty: l.qty, uom: l.uom, batch_no: l.batch_no, serial_no: l.serial_no,
      ...(l.discount_percentage !== undefined ? { discount_percentage: l.discount_percentage } : {}),
      ...(l.rate !== undefined ? { rate: l.rate, price_list_rate: l.price_list_rate } : {}) })),
  }), [profile?.name, customer, discount, coupon, remarks, lines]);

  // ERPNext's own totals (price list, pricing rules, coupon, taxes, rounding), refreshed as the cart changes
  useEffect(() => {
    if (!profile || !lines.length) { setPreview(null); return; }
    const local = () => {
      const t = localTotals(lines, discount, bundle?.taxes ?? [], bundle?.profile.disable_rounded_total);
      setPreview({ ...t, items: t.items.map((i) => ({ ...i, pricing_rules: undefined, is_free_item: 0 })) });
    };
    if (offline) { local(); return; }
    const t = setTimeout(() => {
      postCall<Preview>("mm_core.pos.preview", { data: JSON.stringify(payload) }).then(setPreview)
        .catch((e) => { if (isNetworkError(e)) { sync.markOffline(); local(); } else toast.error(humanizeError(e), { id: "pos-preview" }); });
    }, 250);
    return () => clearTimeout(t);
  }, [payload, profile, lines, offline, discount, bundle]); // eslint-disable-line react-hooks/exhaustive-deps

  const hold = useCallback(async () => {
    if (offline) { toast.error("Holding a sale needs the server — finish it or wait for the connection."); return; }
    try {
      const r = (await postCall<{ name: string }>("mm_core.pos.submit_invoice", { data: JSON.stringify({ ...payload, hold: 1, draft }) }));
      toast.success(`Held as ${r.name}`);
      clear();
    } catch (e) { toast.error(humanizeError(e)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, draft, offline]);

  // keyboard (POS Awesome style): F2 search, F4 customer, F8 hold, F9 pay, F10 orders, Ctrl+Del clear, ? help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pay || (panel && panel !== "keys")) return;
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "F4") { e.preventDefault(); customerRef.current?.focus(); }
      else if (e.key === "F8" && lines.length) { e.preventDefault(); void hold(); }
      else if (e.key === "F9" && lines.length && preview) { e.preventDefault(); setPay(true); }
      else if (e.key === "F10") { e.preventDefault(); setPanel("orders"); }
      else if (e.key === "F12") { e.preventDefault(); setPanel("sync"); }
      else if (e.key === "Delete" && e.ctrlKey) { e.preventDefault(); clear(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, preview, pay, panel, hold]);

  const resume = async (name: string) => {
    try {
      const r = await getCall<{ name: string; customer: string; discount_percentage: number; coupon_code?: string; remarks?: string; items: (Line & { name: string })[] }>(
        "mm_core.pos.load_invoice", { name });
      setLines(r.items.map((i) => ({ key: i.name, item_code: i.item_code, item_name: i.item_name, qty: i.qty, uom: i.uom, price_list_rate: i.price_list_rate,
        rate: i.rate !== i.price_list_rate && !i.discount_percentage ? i.rate : undefined, discount_percentage: i.discount_percentage || undefined, stock: 0,
        batch_no: i.batch_no || undefined, serial_no: i.serial_no || undefined })));
      setCustomer(r.customer); setDiscount(r.discount_percentage || 0); setRemarks(r.remarks || ""); setDraft(r.name); setPanel(null);
      setCoupon(r.coupon_code ? { name: r.coupon_code, coupon_code: r.coupon_code } : null);
    } catch (e) { toast.error(humanizeError(e)); }
  };

  if (isLoading && !ctx && !ctxError) return <div className="space-y-3 p-4"><Skeleton className="h-12" /><Skeleton className="h-96" /></div>;
  if (!ctx && (ctxError || offline)) {
    return (
      <Card className="mx-auto mt-10 max-w-lg space-y-2 p-6 text-center">
        <CloudOff className="mx-auto h-8 w-8 text-rose-500" />
        <h2 className="text-lg font-semibold">Can't reach the server</h2>
        <p className="text-sm text-muted-foreground">This device has no offline data yet. Open the terminal once while online — after that it keeps selling offline.</p>
        <Button variant="outline" onClick={() => void reloadCtx()}><RefreshCw className="h-4 w-4" /> Retry</Button>
      </Card>
    );
  }
  if (!ctx?.profiles.length) {
    return (
      <Card className="mx-auto mt-10 max-w-lg space-y-2 p-6 text-center">
        <Store className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No POS profile for you</h2>
        <p className="text-sm text-muted-foreground">Ask an administrator to add you to a POS Profile (Point of Sale → POS Profiles).</p>
      </Card>
    );
  }
  if (!ctx.shift) {
    if (offline) return <Card className="mx-auto mt-10 max-w-lg p-6 text-center text-sm text-muted-foreground"><CloudOff className="mx-auto mb-2 h-8 w-8 text-rose-500" />Opening a shift needs the server. Reconnect, then open the shift.</Card>;
    return <OpenShift ctx={ctx} onOpened={() => void reloadCtx()} />;
  }

  const total = preview ? preview.rounded_total || preview.grand_total : 0;
  const regular = preview?.items.filter((r) => !r.is_free_item) ?? [];
  const freeRows = preview?.items.filter((r) => r.is_free_item) ?? [];
  const rowFor = (i: number) => regular[i];
  const isWalkIn = customer === profile?.customer;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[560px] flex-col gap-3">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white shadow"><Store className="h-4 w-4" /></span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{profile?.name}</div>
            <div className="text-[11px] text-muted-foreground">{ctx.cashier} · {ctx.shift.name} · since {new Date(ctx.shift.period_start_date.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" disabled={offline} onClick={() => setPanel("offers")}><Gift className="h-4 w-4" /> Offers{offerCount ? <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">{offerCount}</span> : null}</Button>
          <SyncBadge sync={sync} onClick={() => setPanel("sync")} />
          <Button size="sm" variant="outline" disabled={offline} onClick={() => setPanel("held")}><PauseCircle className="h-4 w-4" /> Held</Button>
          <Button size="sm" variant="outline" onClick={() => setPanel("orders")}><History className="h-4 w-4" /> Invoices</Button>
          <Button size="sm" variant="ghost" onClick={() => setPanel("printer")} aria-label="Receipt printer" title="Receipt printer"><Printer className="h-4 w-4" /></Button>
          <Link to="/pos" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-muted"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
          <Button size="sm" variant="ghost" onClick={() => setPanel("keys")} aria-label="Keyboard shortcuts"><Keyboard className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="text-rose-600" disabled={offline} onClick={() => setPanel("close")}><LogOut className="h-4 w-4" /> Close shift</Button>
        </div>
      </div>

      {offline && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
          <CloudOff className="h-4 w-4" /> Offline — selling from this device's data{bundle ? ` (cached ${new Date(bundle.generated_at.replace(" ", "T")).toLocaleString()})` : ""}.
          Prices from the price list; offers, coupons and loyalty apply when online. Sales sync automatically.
        </div>
      )}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* items */}
        <Card className="flex min-h-0 flex-col gap-3 p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input ref={searchRef} id="pos-search" autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search item, scan barcode / batch / serial  (F2)"
                className="h-11 pl-9 text-base" aria-label="Search items"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && items.length === 1) { void add(items[0]); setTerm(""); }
                  if (e.key === "Escape") setTerm("");
                }} />
            </div>
            <div className="flex rounded-lg border border-border p-0.5">
              <button type="button" onClick={() => setView("grid")} aria-label="Grid view" className={cn("rounded-md px-2", view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground")}><LayoutGrid className="h-4 w-4" /></button>
              <button type="button" onClick={() => setView("list")} aria-label="List view" className={cn("rounded-md px-2", view === "list" ? "bg-muted text-foreground" : "text-muted-foreground")}><List className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["", ...(profile?.item_groups ?? [])].map((g) => (
              <button key={g || "all"} type="button" onClick={() => setGroup(g)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", group === g ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                {g || "All items"}</button>
            ))}
          </div>
          {itemsLoading && !items.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No items{debounced ? ` for “${debounced}”` : ""}.</p>
          ) : view === "grid" ? (
            <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 overflow-y-auto pr-1 scrollbar-thin">
              {items.map((it) => (
                <button key={it.item_code} type="button" onClick={() => void add(it)} disabled={!!it.is_stock_item && it.actual_qty <= 0}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-40">
                  {!profile?.hide_images && (it.item_image ? <img src={it.item_image} alt="" className="h-16 w-full object-cover" /> : (
                    <span className={cn("flex h-16 items-center justify-center bg-gradient-to-br text-lg font-bold text-white", tint(it.item_code))}>{initials(it.item_name)}</span>
                  ))}
                  <span className="flex flex-1 flex-col gap-0.5 p-2">
                    <span className="line-clamp-2 text-xs font-medium leading-tight">{it.item_name}</span>
                    <span className="mt-auto text-sm font-semibold tabular-nums text-primary">{money(it.price_list_rate)}</span>
                    <StockNote it={it} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-1 text-left">Item</th><th className="text-left">UOM</th><th className="text-right">Stock</th><th className="text-right">Rate</th><th /></tr></thead>
                <tbody>{items.map((it) => (
                  <tr key={it.item_code} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => void add(it)}>
                    <td className="py-1.5"><div className="font-medium">{it.item_name}</div><div className="text-[11px] text-muted-foreground">{it.item_code}</div></td>
                    <td className="text-xs text-muted-foreground">{it.uom || it.stock_uom}</td>
                    <td className={cn("text-right tabular-nums", it.is_stock_item && it.actual_qty <= 0 ? "text-rose-600" : "")}>{it.is_stock_item ? it.actual_qty : "—"}</td>
                    <td className="text-right font-semibold tabular-nums text-primary">{money(it.price_list_rate)}</td>
                    <td className="w-8 text-right"><Plus className="ml-auto h-4 w-4 text-muted-foreground" /></td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
        </Card>

        {/* cart */}
        <Card className="flex min-h-0 flex-col p-0">
          <div className="space-y-2 border-b border-border p-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CustomerPicker value={customer} onChange={setCustomer} inputRef={customerRef} offlineList={offline ? bundle?.customers ?? [] : undefined} />
              <Button size="sm" variant="outline" disabled={offline} onClick={() => setPanel("customer")} aria-label="New customer"><UserPlus className="h-4 w-4" /></Button>
            </div>
            {cust && !isWalkIn && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                {cust.mobile_no && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{cust.mobile_no}</span>}
                <span className={cn("inline-flex items-center gap-1", cust.outstanding > 0 && "font-medium text-rose-600")}><Wallet className="h-3 w-3" />Due {money(cust.outstanding)}{cust.credit_limit ? ` / limit ${money(cust.credit_limit)}` : ""}
                  {cust.outstanding > 0 && <button type="button" onClick={() => setPanel("dues")} className="ml-1 inline-flex items-center gap-0.5 rounded border border-rose-500/40 px-1 hover:bg-rose-500/10"><HandCoins className="h-3 w-3" />Receive</button>}</span>
                {cust.loyalty_program && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><Award className="h-3 w-3" />{cust.loyalty_points} pts{cust.tier_name ? ` · ${cust.tier_name}` : ""}</span>}
                {cust.last_purchase && <span>Last: {money(cust.last_purchase.grand_total)} on {cust.last_purchase.posting_date}</span>}
              </div>
            )}
            {draft && <span className="inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">resumed {draft}</span>}
          </div>
          <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <ShoppingBag className="h-8 w-8" /> Tap an item or scan a barcode to start a sale.
              </div>
            ) : lines.map((l, i) => {
              const row = rowFor(i);
              const offer = row && hasRules(row.pricing_rules) && row.discount_percentage > 0 && l.discount_percentage === undefined;
              return (
                <CartLine key={l.key} line={l} row={row} offer={!!offer} profile={profile!} money={money} open={open === l.key}
                  onToggle={() => setOpen(open === l.key ? null : l.key)} onChange={(p) => update(l.key, p)} />
              );
            })}
            {freeRows.map((r, i) => (
              <div key={`free-${i}`} className="flex items-center justify-between gap-2 bg-emerald-500/5 p-3 text-sm">
                <div className="min-w-0"><div className="truncate font-medium">{r.item_name}</div><div className="text-[11px] text-muted-foreground">{r.qty} {r.uom}</div></div>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">FREE</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 border-t border-border p-3 text-sm">
            <Row k="Net total" v={money(preview?.net_total)} />
            <div className="flex items-center gap-2">
              {offline ? <span className="flex-1 text-[11px] text-muted-foreground">Coupons need the server</span> : <CouponBox coupon={coupon} onApply={setCoupon} />}
              {profile?.allow_discount_change ? (
                <label className="flex items-center gap-1 text-xs text-muted-foreground" htmlFor="pos-disc"><Percent className="h-3.5 w-3.5" />Bill
                  <input id="pos-disc" type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-16 rounded-md border border-border bg-transparent px-1.5 py-0.5 text-right text-sm tabular-nums" /></label>
              ) : null}
            </div>
            {preview?.discount_amount ? <Row k={`Discount${preview.additional_discount_percentage ? ` (${preview.additional_discount_percentage}%)` : ""}`} v={`− ${money(preview.discount_amount)}`} /> : null}
            {(preview?.taxes ?? []).map((t) => <Row key={t.description} k={t.description} v={money(t.tax_amount)} />)}
            <div className="flex items-baseline justify-between border-t border-dashed border-border pt-2">
              <button type="button" onClick={() => { const r = window.prompt("Note on this sale", remarks); if (r !== null) setRemarks(r); }}
                className={cn("inline-flex items-center gap-1 text-[11px]", remarks ? "text-primary" : "text-muted-foreground hover:text-foreground")} title={remarks || "Add a note"}>
                <MessageSquare className="h-3.5 w-3.5" />{remarks ? "Note" : "Add note"}</button>
              <span className="flex items-baseline gap-2"><span className="text-base font-semibold">Total</span><span className="text-2xl font-bold tabular-nums text-primary">{money(total)}</span></span>
            </div>
            <div className="grid grid-cols-[auto_auto_1fr] gap-2 pt-1">
              <Button variant="outline" disabled={!lines.length} onClick={clear} aria-label="Clear cart" title="Clear (Ctrl+Del)"><X className="h-4 w-4" /></Button>
              <Button variant="outline" disabled={!lines.length || offline} onClick={() => void hold()} title="Hold (F8)"><PauseCircle className="h-4 w-4" /> Hold</Button>
              <Button disabled={!lines.length || !preview} onClick={() => setPay(true)} className="h-11 text-base"><Banknote className="h-5 w-5" /> Pay {money(total)} <span className="text-[10px] opacity-70">F9</span></Button>
            </div>
          </div>
        </Card>
      </div>

      {pay && profile && <PayDialog profile={profile} total={total} payload={payload} draft={draft} money={money} customer={offline ? undefined : cust} isWalkIn={isWalkIn}
        offline={offline} sync={sync} bundle={bundle} cashier={ctx.cashier} preview={preview!} lines={lines} customerName={cust?.customer_name ?? bundle?.customers.find((c) => c.name === customer)?.customer_name ?? customer}
        onClose={() => setPay(false)} onDone={() => { setPay(false); clear(); if (!offline) void reloadCustomer(); else void loadBundle(profile.name).then((b) => b && setBundle(b)); searchRef.current?.focus(); }} />}
      {panel === "held" && profile && <HeldDialog profile={profile} money={money} onClose={() => setPanel(null)} onResume={resume} />}
      {panel === "orders" && profile && <InvoicesDialog profile={profile} money={money} online={!offline} onClose={() => setPanel(null)} onResume={(n) => void resume(n)} />}
      {panel === "sync" && profile && <SyncDialog sync={sync} profile={profile} money={money} bundle={bundle} onRefreshBundle={pullBundle} onClose={() => setPanel(null)} />}
      {panel === "printer" && <PrinterSettingsDialog onClose={() => setPanel(null)} />}
      {panel === "dues" && profile && cust && <ReceiveDuesDialog customer={cust.name} customerName={cust.customer_name} outstanding={cust.outstanding} profile={profile} money={money}
        currency={profile.currency} cashier={ctx.cashier} company={bundle?.company ?? { company_name: profile.company }} onClose={() => setPanel(null)} onDone={() => { setPanel(null); void reloadCustomer(); }} />}
      {panel === "offers" && profile && <OffersDialog profile={profile} money={money} onClose={() => setPanel(null)}
        onCoupon={(c) => { setCoupon(c); setPanel(null); toast.success(`Coupon ${c.coupon_code} applied`); }} />}
      {panel === "customer" && <NewCustomerDialog onClose={() => setPanel(null)} onCreated={(name) => { setCustomer(name); setPanel(null); }} />}
      {panel === "keys" && <ShortcutsDialog onClose={() => setPanel(null)} />}
      {panel === "close" && <CloseShiftDialog money={money} pending={sync.queue.length} onSync={() => void sync.sync()} onClose={() => setPanel(null)} onClosed={() => { setPanel(null); clear(); void reloadCtx(); }} />}
    </div>
  );
}

const modeIcon = (mode: string) => /cash/i.test(mode) ? Banknote : /card/i.test(mode) ? CreditCard : /cheque|check|draft/i.test(mode) ? FileText
  : /wallet|easypaisa|jazz|mobile/i.test(mode) ? Smartphone : /bank|wire|transfer/i.test(mode) ? Landmark : Wallet;

function PayTile({ label, icon: Icon, active, onClick, sub, tone }: { label: string; icon: typeof Banknote; active: boolean; onClick: () => void; sub?: string; tone?: "amber" }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-sm font-medium transition",
        active ? (tone === "amber" ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-primary bg-primary/10 text-primary")
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
      <Icon className="h-6 w-6" /><span className="truncate">{label}</span>{sub && <span className="text-[10px] font-normal tabular-nums opacity-80">{sub}</span>}
    </button>
  );
}

function SyncBadge({ sync, onClick }: { sync: SyncState; onClick: () => void }) {
  const failed = sync.queue.filter((q) => q.status === "failed").length;
  const pending = sync.queue.length;
  return (
    <button type="button" onClick={onClick} title="Sync status (F12)"
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium",
        !sync.online ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400" : failed ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>
      {sync.syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : sync.online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
      {sync.online ? (sync.syncing ? "Syncing" : "Online") : "Offline"}
      {pending > 0 && <span className="rounded-full bg-current/10 px-1.5 tabular-nums">{pending} {failed ? `· ${failed} failed` : "pending"}</span>}
    </button>
  );
}

function StockNote({ it }: { it: Item }) {
  if (!it.is_stock_item) return <span className="text-[10px] text-muted-foreground">Service</span>;
  return <span className={cn("text-[10px]", it.actual_qty > 0 ? "text-muted-foreground" : "text-rose-600")}>{it.actual_qty > 0 ? `${it.actual_qty} ${it.uom || it.stock_uom} in stock` : "Out of stock"}</span>;
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-muted-foreground"><span className="truncate">{k}</span><span className="tabular-nums text-foreground">{v}</span></div>;
}

function CartLine({ line: l, row, offer, profile, money, open, onToggle, onChange }: {
  line: Line; row?: PreviewRow; offer: boolean; profile: Profile; money: Money; open: boolean; onToggle: () => void; onChange: (p: Partial<Line>) => void;
}) {
  const [opts, setOpts] = useState<ItemOptions | null>(null);
  useEffect(() => { if (open && !opts) void itemOptions(l.item_code, profile.warehouse).then(setOpts).catch(() => undefined); }, [open, opts, l.item_code, profile.warehouse]);
  const rate = row?.rate ?? (l.rate ?? l.price_list_rate) * (1 - (l.discount_percentage ?? 0) / 100);
  const amount = row?.amount ?? l.qty * rate;
  const serials = (l.serial_no ?? "").split("\n").filter(Boolean);
  const toggleSerial = (s: string) => {
    const next = serials.includes(s) ? serials.filter((x) => x !== s) : [...serials, s];
    onChange({ serial_no: next.join("\n") || undefined, qty: Math.max(next.length, 1) });
  };
  return (
    <div className={cn("space-y-1.5 p-3", open && "bg-muted/30")}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={onToggle}>
          <div className="flex items-center gap-1.5 truncate text-sm font-medium">{l.item_name}
            {offer && <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"><Tag className="h-2.5 w-2.5" />{row!.discount_percentage}% offer</span>}
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition", open && "rotate-180")} /></div>
          <div className="text-[11px] text-muted-foreground">
            {money(rate)} / {l.uom}{row && row.price_list_rate > rate + 0.004 ? <s className="ml-1 opacity-60">{money(row.price_list_rate)}</s> : null}
            {l.batch_no ? ` · batch ${l.batch_no}` : ""}{serials.length ? ` · ${serials.length} serial${serials.length > 1 ? "s" : ""}` : ""}
          </div>
        </button>
        <div className="text-right text-sm font-semibold tabular-nums">{money(amount)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-border">
          <button type="button" className="px-2 py-1 hover:bg-muted" onClick={() => onChange({ qty: l.qty - 1 })} aria-label="Less"><Minus className="h-3.5 w-3.5" /></button>
          <input type="number" value={l.qty} min={0} onChange={(e) => onChange({ qty: Number(e.target.value) })}
            className="w-16 border-x border-border bg-transparent py-1 text-center text-sm tabular-nums outline-none" aria-label="Quantity" />
          <button type="button" className="px-2 py-1 hover:bg-muted" onClick={() => onChange({ qty: l.qty + 1 })} aria-label="More"><Plus className="h-3.5 w-3.5" /></button>
        </div>
        {profile.allow_discount_change ? (
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">Disc %
            <input type="number" value={l.discount_percentage ?? ""} placeholder={row?.discount_percentage ? String(row.discount_percentage) : "0"} min={0} max={100}
              onChange={(e) => onChange({ discount_percentage: e.target.value === "" ? undefined : Number(e.target.value) })}
              className="w-14 rounded-md border border-border bg-transparent px-1.5 py-0.5 text-xs tabular-nums" /></label>
        ) : null}
        <button type="button" className="ml-auto rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600" onClick={() => onChange({ qty: 0 })} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <label className="space-y-0.5"><span className="text-muted-foreground">UOM</span>
            <Select value={l.uom} onChange={(e) => onChange({ uom: e.target.value, rate: undefined })} className="h-8 text-xs">
              {(opts?.uoms ?? [{ uom: l.uom, conversion_factor: 1 }]).map((u) => <option key={u.uom} value={u.uom}>{u.uom}{u.conversion_factor !== 1 ? ` (×${u.conversion_factor})` : ""}</option>)}
            </Select></label>
          {profile.allow_rate_change ? (
            <label className="space-y-0.5"><span className="text-muted-foreground">Rate</span>
              <Input type="number" min={0} value={l.rate ?? row?.price_list_rate ?? l.price_list_rate} onChange={(e) => onChange({ rate: Number(e.target.value) })} className="h-8 text-xs" /></label>
          ) : <div />}
          {opts?.has_batch_no ? (
            <label className="col-span-2 space-y-0.5"><span className="text-muted-foreground">Batch</span>
              <Select value={l.batch_no ?? ""} onChange={(e) => onChange({ batch_no: e.target.value || undefined })} className="h-8 text-xs">
                {opts.batches.map((b) => <option key={b.batch_no} value={b.batch_no}>{b.batch_no} — {b.qty} available{b.expiry_date ? ` · exp ${b.expiry_date}` : ""}</option>)}
              </Select></label>
          ) : null}
          {opts?.has_serial_no ? (
            <div className="col-span-2 space-y-1"><span className="text-muted-foreground">Serial numbers ({serials.length} selected)</span>
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">{opts.serials.map((s) => (
                <button key={s} type="button" onClick={() => toggleSerial(s)}
                  className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px]", serials.includes(s) ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{s}</button>
              ))}{opts.serials.length === 0 && <span className="text-muted-foreground">No serials in this warehouse.</span>}</div></div>
          ) : null}
          {opts && <div className="col-span-2 text-[11px] text-muted-foreground">{opts.actual_qty} {opts.stock_uom} in {profile.warehouse}</div>}
        </div>
      )}
    </div>
  );
}

function CustomerPicker({ value, onChange, inputRef, offlineList }: {
  value: string; onChange: (v: string) => void; inputRef: React.RefObject<HTMLInputElement>; offlineList?: { name: string; customer_name: string; mobile_no?: string }[];
}) {
  const [q, setQ] = useState("");
  const { data: live } = useFrappeGetDocList<{ name: string; customer_name: string; mobile_no?: string }>("Customer", {
    fields: ["name", "customer_name", "mobile_no"] as never, filters: [["disabled", "=", 0]] as never,
    orFilters: q ? ([["name", "like", `%${q}%`], ["customer_name", "like", `%${q}%`], ["mobile_no", "like", `%${q}%`]] as never) : undefined, limit: 20,
  }, offlineList ? null : `pos.customers.${q}`);
  const ql = q.toLowerCase();
  const data = offlineList ? offlineList.filter((c) => !ql || c.name.toLowerCase().includes(ql) || c.customer_name.toLowerCase().includes(ql) || (c.mobile_no ?? "").includes(ql)).slice(0, 30) : live;
  return (
    <>
      <input ref={inputRef} list="pos-customers" value={q || value} onChange={(e) => { setQ(e.target.value); const hit = (data ?? []).find((c) => c.name === e.target.value); if (hit) { onChange(hit.name); setQ(""); } }}
        onBlur={() => setQ("")} className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-sm" placeholder="Customer, mobile…  (F4)" aria-label="Customer" />
      <datalist id="pos-customers">{(data ?? []).map((c) => <option key={c.name} value={c.name}>{c.customer_name}{c.mobile_no ? ` · ${c.mobile_no}` : ""}</option>)}</datalist>
    </>
  );
}

function CouponBox({ coupon, onApply }: { coupon: Coupon | null; onApply: (c: Coupon | null) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  if (coupon) {
    return (
      <span className="inline-flex flex-1 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
        <Ticket className="h-3.5 w-3.5" /><span className="truncate font-medium">{coupon.coupon_code}</span>{coupon.title ? <span className="truncate opacity-75">· {coupon.title}</span> : null}
        <button type="button" className="ml-auto" onClick={() => onApply(null)} aria-label="Remove coupon"><X className="h-3.5 w-3.5" /></button>
      </span>
    );
  }
  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try { const c = (await getCall<Coupon>("mm_core.pos.check_coupon", { code: code.trim() })); onApply(c); setCode(""); toast.success(`Coupon ${c.coupon_code} applied`); }
    catch (e) { toast.error(humanizeError(e)); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-1 items-center gap-1">
      <div className="relative flex-1"><Ticket className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && void apply()} placeholder="Coupon code"
          className="w-full rounded-md border border-border bg-transparent py-0.5 pl-7 pr-2 text-xs uppercase" aria-label="Coupon code" /></div>
      <Button size="sm" variant="outline" className="h-6 px-2 text-xs" disabled={busy || !code.trim()} onClick={() => void apply()}>Apply</Button>
    </div>
  );
}

function OpenShift({ ctx, onOpened }: { ctx: Ctx; onOpened: () => void }) {
  const [profile, setProfile] = useState(ctx.profile?.name ?? ctx.profiles[0]?.name ?? "");
  const { data } = useFrappeGetCall<{ message: Ctx }>("mm_core.pos.get_context", { pos_profile: profile }, `mm_core.pos.ctx.${profile}`);
  const p = unwrap<Ctx>(data)?.profile;
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      await postCall("mm_core.pos.open_shift", { pos_profile: profile, balances: JSON.stringify((p?.payments ?? []).map((m) => ({ mode_of_payment: m.mode_of_payment, opening_amount: amounts[m.mode_of_payment] ?? 0 }))) });
      toast.success("Shift opened");
      onOpened();
    } catch (e) { toast.error(humanizeError(e)); } finally { setBusy(false); }
  };
  return (
    <Card className="mx-auto mt-8 max-w-md space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white shadow"><Store className="h-5 w-5" /></span>
        <div><h2 className="text-lg font-semibold">Open a shift</h2><p className="text-xs text-muted-foreground">Count the cash in the drawer before the first sale.</p></div>
      </div>
      <div className="space-y-1"><label htmlFor="pos-prof" className="text-xs text-muted-foreground">Counter (POS profile)</label>
        <Select id="pos-prof" value={profile} onChange={(e) => setProfile(e.target.value)}>{ctx.profiles.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}</Select></div>
      <div className="space-y-2">
        {(p?.payments ?? []).map((m) => (
          <div key={m.mode_of_payment} className="flex items-center justify-between gap-3">
            <label htmlFor={`open-${m.mode_of_payment}`} className="text-sm">{m.mode_of_payment} opening</label>
            <Input id={`open-${m.mode_of_payment}`} type="number" min={0} value={amounts[m.mode_of_payment] ?? 0} className="w-40 text-right"
              onChange={(e) => setAmounts((a) => ({ ...a, [m.mode_of_payment]: Number(e.target.value) }))} />
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={() => void open()} disabled={busy || !p}>Open shift</Button>
    </Card>
  );
}

function PayDialog({ profile, total, payload, draft, money, customer, isWalkIn, offline, sync, bundle, cashier, preview, lines, customerName, onClose, onDone }: {
  profile: Profile; total: number; payload: Record<string, unknown>; draft: string | null; money: Money; customer?: CustomerInfo; isWalkIn: boolean;
  offline: boolean; sync: SyncState; bundle?: OfflineBundle; cashier: string; preview: Preview; lines: Line[]; customerName: string;
  onClose: () => void; onDone: () => void;
}) {
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const def = profile.payments.find((m) => m.default)?.mode_of_payment ?? profile.payments[0]?.mode_of_payment;
  const [amounts, setAmounts] = useState<Record<string, number>>(def ? { [def]: total } : {});
  const [points, setPoints] = useState(0);
  const [credit, setCredit] = useState(false);
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10); });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; change_amount?: number; outstanding_amount?: number; write_off_amount?: number; loyalty_amount?: number; print_format: string } | null>(null);

  const cf = customer?.conversion_factor ?? 0;
  const maxPoints = customer?.loyalty_program ? Math.min(customer.loyalty_points, cf ? Math.floor(total / cf) : 0) : 0;
  const loyaltyAmount = Math.round(points * cf * 100) / 100;
  const due = Math.max(0, total - loyaltyAmount);
  const paid = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const short = Math.round((due - paid) * 100) / 100;
  const change = Math.max(0, paid - due);
  const canWriteOff = short > 0 && short <= (profile.write_off_limit ?? 0);
  const canCredit = !!profile.allow_partial_payment && !isWalkIn;
  const printer = loadPrinter();
  const autoPrint = printer.autoPrint || !!profile.print_receipt_on_order_complete;
  const paymentsOut = () => Object.entries(amounts).filter(([, a]) => Number(a)).map(([mode_of_payment, amount]) => ({ mode_of_payment, amount, reference_no: refs[mode_of_payment] || undefined }));

  /** Ring the sale up on this device (offline): queue it, take the stock off the cached grid, print a local receipt. */
  const queueOffline = async (opts: { write_off?: boolean }) => {
    const now = new Date();
    const offline_id = uuid();
    const payments = paymentsOut();
    const paidNow = payments.reduce((a, p) => a + Number(p.amount), 0);
    const data = { ...payload, draft: undefined, coupon_code: undefined, offline_id, offline_at: `${localDate(now)} ${localTime(now)}`, posting_date: localDate(now),
      posting_time: localTime(now), credit: credit ? 1 : undefined, due_date: credit ? dueDate : undefined, write_off: opts.write_off ? 1 : undefined, payments };
    const rc: ReceiptData = {
      name: `OFFLINE-${offline_id.slice(0, 8).toUpperCase()}`, posting_date: localDate(now), posting_time: localTime(now), customer: String(payload.customer ?? ""),
      customer_name: customerName, cashier, pos_profile: profile.name, currency: profile.currency, company: bundle?.company ?? { company_name: profile.company },
      items: preview.items.map((i) => ({ ...i })), total: preview.total, net_total: preview.net_total, discount_amount: preview.discount_amount,
      additional_discount_percentage: preview.additional_discount_percentage, taxes: preview.taxes, grand_total: preview.grand_total, rounded_total: total,
      payments, paid_amount: paidNow, change_amount: Math.max(0, paidNow - total), outstanding_amount: credit ? Math.max(0, total - paidNow) : 0,
      write_off_amount: opts.write_off ? Math.max(0, total - paidNow) : 0, remarks: payload.remarks as string | undefined, offline_id, pending_sync: true,
      total_qty: lines.reduce((a, l) => a + l.qty, 0),
    };
    const q: QueuedSale = { offline_id, created: now.toISOString(), pos_profile: profile.name, customer_name: customerName, total, status: "pending", attempts: 0, data, receipt: rc };
    await sync.enqueue(q);
    await consumeBundleStock(profile.name, lines.map((l) => ({ item_code: l.item_code, qty: l.qty })));
    setReceipt(rc);
    setDone({ name: rc.name, change_amount: rc.change_amount, outstanding_amount: rc.outstanding_amount, write_off_amount: rc.write_off_amount, print_format: "" });
    if (autoPrint) printReceipt(rc, printer);
  };
  const quick = [due, Math.ceil(due / 100) * 100, Math.ceil(due / 500) * 500, Math.ceil(due / 1000) * 1000, Math.ceil(due / 5000) * 5000]
    .filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 5);

  // keep the default mode at "exactly the amount due" when loyalty points change the due amount
  const [tile, setTile] = useState<string>(def ?? "split");          // a payment mode, "credit" (pay later) or "split"
  useEffect(() => { if (tile !== "split" && tile !== "credit") setAmounts({ [tile]: due }); }, [due, tile]);
  const pick = (t: string) => {
    setTile(t);
    if (t === "credit") { setCredit(true); setAmounts({}); }
    else { setCredit(false); if (t !== "split") setAmounts({ [t]: due }); }
  };

  const complete = async (opts: { write_off?: boolean } = {}) => {
    setBusy(true);
    try {
      if (offline) { await queueOffline(opts); return; }
      const r = await postCall<NonNullable<typeof done>>("mm_core.pos.submit_invoice", {
        data: JSON.stringify({ ...payload, draft, redeem_points: points || undefined, credit: credit ? 1 : undefined, due_date: credit ? dueDate : undefined,
          write_off: opts.write_off ? 1 : undefined, payments: paymentsOut() }),
      });
      setDone(r);
      void getCall<ReceiptData>("mm_core.pos.receipt", { name: r.name }).then((rc) => { setReceipt(rc); if (autoPrint) printReceipt(rc, printer); }).catch(() => undefined);
    } catch (e) {
      if (isNetworkError(e) && !draft) {                       // connection dropped mid-sale: keep selling offline
        sync.markOffline();
        toast("Connection lost — sale saved on this device and will sync.", { icon: "📴" });
        await queueOffline(opts);
      } else toast.error(humanizeError(e));
    } finally { setBusy(false); }
  };
  const ready = short <= 0.005 || credit;

  return (
    <Dialog open onClose={done ? onDone : onClose} title={done ? "Sale complete" : "Payment"} size="md">
      {done ? (
        <div className="space-y-4 text-center">
          <Receipt className="mx-auto h-10 w-10 text-emerald-500" />
          <div><div className="text-sm text-muted-foreground">{done.name}</div><div className="text-2xl font-bold">{money(total)}</div></div>
          {done.change_amount ? <div className="rounded-xl bg-amber-500/10 p-3 text-lg font-semibold text-amber-700 dark:text-amber-400">Change: {money(done.change_amount)}</div> : null}
          {credit && done.outstanding_amount ? <div className="rounded-xl bg-rose-500/10 p-2 text-sm font-medium text-rose-600">On credit: {money(done.outstanding_amount)} due {dueDate}</div> : null}
          {done.loyalty_amount ? <div className="text-xs text-amber-600">Loyalty redeemed: {money(done.loyalty_amount)}</div> : null}
          {done.write_off_amount ? <div className="text-xs text-muted-foreground">Written off: {money(done.write_off_amount)}</div> : null}
          {receipt?.pending_sync && <div className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500/10 p-2 text-xs text-sky-700 dark:text-sky-400"><CloudOff className="h-3.5 w-3.5" /> Saved offline — syncs automatically</div>}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" disabled={!receipt} onClick={() => receipt && printReceipt(receipt, printer)}><Printer className="h-4 w-4" /> Receipt</Button>
            <Button variant="outline" disabled={!!receipt?.pending_sync} onClick={() => window.open(printUrl(done.name, done.print_format), "_blank")}><FileText className="h-4 w-4" /> A4</Button>
            <Button onClick={onDone} autoFocus>New sale</Button></div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) void complete(); }}>
          <div className="flex items-baseline justify-between rounded-xl bg-muted/50 p-3"><span className="text-sm text-muted-foreground">To pay</span>
            <span className="text-right"><span className="text-3xl font-bold tabular-nums">{money(due)}</span>{loyaltyAmount ? <span className="block text-[11px] text-muted-foreground">{money(total)} − {money(loyaltyAmount)} points</span> : null}</span></div>
          {maxPoints > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
              <label htmlFor="pay-points" className="flex items-center gap-2 text-sm"><Award className="h-4 w-4 text-amber-500" />Redeem points <span className="text-[11px] text-muted-foreground">({customer?.loyalty_points} available · 1 pt = {money(cf)})</span></label>
              <div className="flex items-center gap-1"><Input id="pay-points" type="number" min={0} max={maxPoints} value={points || ""} className="w-24 text-right"
                onChange={(e) => setPoints(Math.max(0, Math.min(maxPoints, Math.floor(Number(e.target.value) || 0))))} />
                <Button type="button" size="sm" variant="outline" onClick={() => setPoints(maxPoints)}>Max</Button></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {profile.payments.map((m) => <PayTile key={m.mode_of_payment} label={m.mode_of_payment} icon={modeIcon(m.mode_of_payment)} active={tile === m.mode_of_payment}
              onClick={() => pick(m.mode_of_payment)} sub={tile === m.mode_of_payment ? money(amounts[m.mode_of_payment] ?? 0) : undefined} />)}
            {canCredit && <PayTile label="Pay later" icon={CalendarClock} active={tile === "credit"} onClick={() => pick("credit")} sub="credit sale" tone="amber" />}
            {profile.payments.length > 1 && <PayTile label="Split" icon={SplitSquareHorizontal} active={tile === "split"} onClick={() => pick("split")} sub="several modes" />}
          </div>
          {profile.payments.filter((m) => tile === "split" || tile === m.mode_of_payment).map((m) => (
            <div key={m.mode_of_payment} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`pay-${m.mode_of_payment}`} className="flex items-center gap-2 text-sm font-medium">
                  {(() => { const I = modeIcon(m.mode_of_payment); return <I className="h-4 w-4" />; })()}{m.mode_of_payment}</label>
                <div className="flex items-center gap-1">
                  <Input id={`pay-${m.mode_of_payment}`} type="number" min={0} value={amounts[m.mode_of_payment] ?? ""} className="w-40 text-right text-base"
                    onChange={(e) => setAmounts((a) => ({ ...a, [m.mode_of_payment]: Number(e.target.value) }))} />
                  <Button type="button" size="sm" variant="ghost" title="Put the remainder here"
                    onClick={() => setAmounts((a) => ({ ...a, [m.mode_of_payment]: Math.max(0, (a[m.mode_of_payment] ?? 0) + short) }))}>=</Button>
                </div>
              </div>
              {!/cash/i.test(m.mode_of_payment) && (amounts[m.mode_of_payment] ?? 0) > 0 && (
                <div className="flex justify-end"><Input value={refs[m.mode_of_payment] ?? ""} onChange={(e) => setRefs((r) => ({ ...r, [m.mode_of_payment]: e.target.value }))}
                  placeholder="Card / slip / transaction no" className="h-8 w-56 text-xs" aria-label={`${m.mode_of_payment} reference`} /></div>
              )}
              {/cash/i.test(m.mode_of_payment) && (
                <div className="flex flex-wrap justify-end gap-1">{quick.map((v) => (
                  <button key={v} type="button" onClick={() => setAmounts((a) => ({ ...a, [m.mode_of_payment]: v }))} className="rounded-md border border-border px-2 py-0.5 text-xs tabular-nums hover:bg-muted">{money(v)}</button>
                ))}</div>
              )}
            </div>
          ))}
          {canCredit && (tile === "credit" || tile === "split") && (
            <div className="space-y-2 rounded-lg border border-border p-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} disabled={tile === "credit"} />
                <CalendarClock className="h-4 w-4 text-muted-foreground" />Credit sale — {customer?.customer_name} pays {tile === "credit" ? "the full amount" : "the rest"} later</label>
              {credit && (
                <div className="flex items-center justify-between gap-2 text-sm"><label htmlFor="pay-due" className="text-muted-foreground">Due date</label>
                  <Input id="pay-due" type="date" min={today()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-44" /></div>
              )}
              {credit && customer?.credit_limit ? <p className={cn("text-[11px]", customer.outstanding + short > customer.credit_limit ? "text-rose-600" : "text-muted-foreground")}>
                Due after this sale {money(customer.outstanding + Math.max(short, 0))} of {money(customer.credit_limit)} limit</p> : null}
            </div>
          )}
          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <Row k="Paid" v={money(paid)} />
            <div className={cn("flex justify-between font-semibold", short > 0.005 ? (credit ? "text-amber-600" : "text-rose-600") : "text-amber-600")}>
              <span>{short > 0.005 ? (credit ? "On credit" : "Still to pay") : "Change"}</span><span className="tabular-nums">{money(short > 0.005 ? short : change)}</span>
            </div>
          </div>
          {canWriteOff && !credit && (
            <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void complete({ write_off: true })}>Write off {money(short)} and complete</Button>
          )}
          <Button type="submit" className="h-11 w-full text-base" disabled={busy || !ready}>{credit && short > 0.005 ? "Complete credit sale" : "Complete sale"} <span className="text-[10px] opacity-70">Enter</span></Button>
        </form>
      )}
    </Dialog>
  );
}

function HeldDialog({ profile, money, onClose, onResume }: { profile: Profile; money: Money; onClose: () => void; onResume: (n: string) => void }) {
  const { data } = useFrappeGetCall<{ message: { name: string; customer_name: string; grand_total: number; modified: string; remarks?: string }[] }>("mm_core.pos.held_invoices", { pos_profile: profile.name }, `pos.held.${profile.name}.${Date.now() >> 12}`);
  const rows = unwrap<{ name: string; customer_name: string; grand_total: number; modified: string; remarks?: string }[]>(data) ?? [];
  return (
    <Dialog open onClose={onClose} title="Held sales" size="md">
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing on hold.</p> : (
        <ul className="divide-y divide-border">{rows.map((r) => (
          <li key={r.name} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1"><div className="text-sm font-medium">{r.customer_name}</div><div className="truncate text-[11px] text-muted-foreground">{r.name} · {r.modified.slice(0, 16)}{r.remarks ? ` · ${r.remarks}` : ""}</div></div>
            <span className="text-sm font-semibold tabular-nums">{money(r.grand_total)}</span>
            <Button size="sm" onClick={() => onResume(r.name)}>Resume</Button>
          </li>))}</ul>
      )}
    </Dialog>
  );
}

interface Offer { name: string; title?: string; apply_on: string; price_or_product_discount: string; rate_or_discount?: string; discount_percentage?: number; discount_amount?: number;
  rate?: number; min_qty?: number; min_amt?: number; coupon_code_based?: number; free_item?: string; free_qty?: number; valid_upto?: string; targets: string[]; coupons: string[] }

function OffersDialog({ profile, money, onClose, onCoupon }: { profile: Profile; money: Money; onClose: () => void; onCoupon: (c: Coupon) => void }) {
  const { data } = useFrappeGetCall<{ message: Offer[] }>("mm_core.pos.offers", { pos_profile: profile.name }, `pos.offers.${profile.name}`);
  const rows = unwrap<Offer[]>(data) ?? [];
  const benefit = (o: Offer) => o.price_or_product_discount === "Product" ? `Free ${o.free_qty ?? 1} × ${o.free_item || "same item"}`
    : o.rate_or_discount === "Discount Percentage" ? `${o.discount_percentage}% off` : o.rate_or_discount === "Discount Amount" ? `${money(o.discount_amount)} off` : `Special rate ${money(o.rate)}`;
  return (
    <Dialog open onClose={onClose} title="Offers" description="ERPNext pricing rules live today. Automatic offers apply as you add items; coupon offers need the code." size="lg">
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No active offers. Create Pricing Rules (Selling) to run promotions.</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">{rows.map((o) => (
          <li key={o.name} className="space-y-1.5 rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold">{o.title || o.name}</div>
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", o.coupon_code_based ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")}>
                {o.coupon_code_based ? "Coupon" : "Auto"}</span>
            </div>
            <div className="text-lg font-bold text-primary">{benefit(o)}</div>
            <div className="text-[11px] text-muted-foreground">
              {o.apply_on === "Transaction" ? "On the whole bill" : `${o.apply_on}: ${o.targets.join(", ") || "—"}`}
              {o.min_qty ? ` · min ${o.min_qty} qty` : ""}{o.min_amt ? ` · min ${money(o.min_amt)}` : ""}{o.valid_upto ? ` · until ${o.valid_upto}` : ""}
            </div>
            {o.coupons.length > 0 && <div className="flex flex-wrap gap-1">{o.coupons.map((c) => (
              <button key={c} type="button" onClick={() => void getCall<Coupon>("mm_core.pos.check_coupon", { code: c }).then(onCoupon).catch((e) => toast.error(humanizeError(e)))}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-violet-500/50 px-2 py-0.5 font-mono text-xs text-violet-700 hover:bg-violet-500/10 dark:text-violet-400"><Ticket className="h-3 w-3" />{c}</button>
            ))}</div>}
          </li>))}</ul>
      )}
    </Dialog>
  );
}

function NewCustomerDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [f, setF] = useState({ customer_name: "", mobile_no: "", email_id: "", tax_id: "", customer_type: "Individual" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      const r = (await postCall<{ name: string }>("mm_core.pos.create_customer", { data: JSON.stringify(f) }));
      toast.success(`Customer ${r.name} created`);
      onCreated(r.name);
    } catch (e) { toast.error(humanizeError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="New customer" size="sm">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Name *</span><Input autoFocus required value={f.customer_name} onChange={set("customer_name")} /></label>
        <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Mobile</span><Input inputMode="tel" value={f.mobile_no} onChange={set("mobile_no")} placeholder="03xx-xxxxxxx" /></label>
        <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Email</span><Input type="email" value={f.email_id} onChange={set("email_id")} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1 text-sm"><span className="text-muted-foreground">NTN / CNIC</span><Input value={f.tax_id} onChange={set("tax_id")} /></label>
          <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Type</span>
            <Select value={f.customer_type} onChange={set("customer_type")}><option>Individual</option><option>Company</option></Select></label>
        </div>
        <Button type="submit" className="w-full" disabled={busy || !f.customer_name.trim()}><UserPlus className="h-4 w-4" /> Create and select</Button>
      </form>
    </Dialog>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const keys: [string, string][] = [["F2", "Search / scan"], ["F4", "Customer"], ["F8", "Hold the sale"], ["F9", "Pay"], ["F10", "Invoices & returns"], ["F12", "Sync status"], ["Enter", "Add the only match · complete payment"], ["Ctrl + Del", "Clear the cart"], ["Esc", "Clear search · close dialog"]];
  return (
    <Dialog open onClose={onClose} title="Keyboard shortcuts" size="sm">
      <ul className="space-y-1.5 text-sm">{keys.map(([k, v]) => (
        <li key={k} className="flex items-center justify-between"><span className="text-muted-foreground">{v}</span><kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd></li>
      ))}</ul>
    </Dialog>
  );
}

const NOTES = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

function CloseShiftDialog({ money, pending, onSync, onClose, onClosed }: { money: Money; pending: number; onSync: () => void; onClose: () => void; onClosed: () => void }) {
  type Mode = { mode_of_payment: string; opening: number; sales: number; dues?: number; expected: number };
  const { data } = useFrappeGetCall<{ message: { invoices: number; returns: number; total: number; modes: Mode[] } }>("mm_core.pos.shift_summary", undefined, `pos.summary.${Date.now() >> 14}`);
  const s = unwrap<{ invoices: number; returns: number; total: number; modes: Mode[] }>(data);
  const [counted, setCounted] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<number, number>>({});
  const [countNotes, setCountNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const printer = loadPrinter();
  useEffect(() => { if (s) setCounted(Object.fromEntries(s.modes.map((m) => [m.mode_of_payment, m.expected]))); }, [s]);
  const cashMode = s?.modes.find((m) => /cash/i.test(m.mode_of_payment))?.mode_of_payment;
  const notesTotal = NOTES.reduce((a, n) => a + n * (notes[n] ?? 0), 0);
  useEffect(() => { if (countNotes && cashMode) setCounted((c) => ({ ...c, [cashMode]: notesTotal })); }, [countNotes, notesTotal, cashMode]);

  const printX = async () => {
    try { printHtml(shiftReportHtml(await getCall<ShiftReport>("mm_core.pos.shift_report"), printer)); } catch (e) { toast.error(humanizeError(e)); }
  };
  const close = async () => {
    setBusy(true);
    try {
      const r = await postCall<{ name: string }>("mm_core.pos.close_shift", { counted: JSON.stringify(counted) });
      toast.success(`Shift closed — ${r.name}`);
      if (printer.printZOnClose) void getCall<ShiftReport>("mm_core.pos.last_shift_report").then((z) => { if (z?.type) printHtml(shiftReportHtml(z, printer)); }).catch(() => undefined);
      onClosed();
    } catch (e) { toast.error(humanizeError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="Close shift" description="Count the drawer and confirm each payment mode. The Z report prints after closing." size="lg">
      {pending > 0 ? (
        <div className="space-y-3 py-4 text-center">
          <CloudOff className="mx-auto h-8 w-8 text-amber-500" />
          <p className="text-sm">{pending} offline sale(s) on this device haven't synced yet. Sync them before closing the shift.</p>
          <Button onClick={onSync}><RefreshCw className="h-4 w-4" /> Sync now</Button>
        </div>
      ) : !s ? <Skeleton className="h-40" /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/50 p-2"><div className="text-[11px] text-muted-foreground">Sales</div><div className="text-lg font-semibold">{s.invoices}</div></div>
            <div className="rounded-xl bg-muted/50 p-2"><div className="text-[11px] text-muted-foreground">Returns</div><div className="text-lg font-semibold">{s.returns}</div></div>
            <div className="rounded-xl bg-muted/50 p-2"><div className="text-[11px] text-muted-foreground">Net total</div><div className="text-lg font-semibold">{money(s.total)}</div></div>
          </div>
          {cashMode && (
            <div className="rounded-lg border border-border p-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={countNotes} onChange={(e) => setCountNotes(e.target.checked)} /><Calculator className="h-4 w-4 text-muted-foreground" /> Count cash by notes</label>
              {countNotes && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5">{NOTES.map((n) => (
                  <label key={n} className="flex items-center gap-1 text-xs"><span className="w-10 text-right tabular-nums text-muted-foreground">{n} ×</span>
                    <Input type="number" min={0} value={notes[n] ?? ""} onChange={(e) => setNotes((x) => ({ ...x, [n]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} className="h-7 w-16 text-right text-xs" /></label>
                ))}<div className="col-span-full text-right text-sm font-semibold">Cash counted {money(notesTotal)}</div></div>
              )}
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="text-left">Mode</th><th className="text-right">Opening</th><th className="text-right">Sales</th><th className="text-right">Dues</th><th className="text-right">Expected</th><th className="text-right">Counted</th><th className="text-right">Difference</th></tr></thead>
            <tbody>{s.modes.map((m) => {
              const diff = (counted[m.mode_of_payment] ?? 0) - m.expected;
              return (
                <tr key={m.mode_of_payment} className="border-t border-border">
                  <td className="py-2 font-medium">{m.mode_of_payment}</td><td className="text-right tabular-nums">{money(m.opening)}</td><td className="text-right tabular-nums">{money(m.sales)}</td>
                  <td className="text-right tabular-nums">{m.dues ? money(m.dues) : "—"}</td><td className="text-right tabular-nums">{money(m.expected)}</td>
                  <td className="text-right"><Input type="number" value={counted[m.mode_of_payment] ?? 0} disabled={countNotes && m.mode_of_payment === cashMode}
                    onChange={(e) => setCounted((c) => ({ ...c, [m.mode_of_payment]: Number(e.target.value) }))} className="ml-auto h-8 w-28 text-right" aria-label={`Counted ${m.mode_of_payment}`} /></td>
                  <td className={cn("text-right tabular-nums font-medium", Math.abs(diff) < 0.01 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-amber-600")}>{Math.abs(diff) < 0.01 ? "✓" : money(diff)}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="outline" onClick={() => void printX()}><Printer className="h-4 w-4" /> X report</Button>
            <Button disabled={busy} onClick={() => void close()}><LogOut className="h-4 w-4" /> Close shift and post</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
