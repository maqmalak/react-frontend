import { Banknote, CalendarClock, ClipboardList, Coins, DoorClosed, DoorOpen, ReceiptText, ShoppingCart, SlidersHorizontal, Undo2 } from "lucide-react";
import type { ChildTableSpec, DocConfig } from "@/components/doc/doc-config";
import {
  sec, colBreak, tab, data, date, datetime, float, currency, check, text, link, select, ro, req,
  nameCol, textCol, dateCol, dateTimeCol, moneyCol, statusCol, yesNoCol, numCol, fmt, fmtMoney,
} from "@/components/doc/doc-helpers";
import { todayISO, nowERPDateTime } from "@/utils/dates";
import { asNumber } from "@/utils/cn";

/* ============================================================================ POS Invoice */

const POS_ITEMS: ChildTableSpec = {
  tab: "Items",
  key: "items",
  label: "Items",
  doctype: "POS Invoice Item",
  wide: true,
  columns: [
    req(link("item_code", "Item", "Item")),
    data("item_name", "Item Name"),
    req(float("qty", "Qty")),
    req(link("uom", "UOM", "UOM")),
    req(currency("rate", "Rate")),
    float("discount_percentage", "Disc %"),
    ro(currency("amount", "Amount")),
    link("warehouse", "Warehouse", "Warehouse"),
  ],
  dialogColumns: [link("batch_no", "Batch", "Batch"), text("serial_no", "Serial No"), req(link("income_account", "Income Account", "Account")), req(link("cost_center", "Cost Center", "Cost Center"))],
  totals: (rows) => [
    { label: "Qty", value: fmt(rows.reduce((s, r) => s + asNumber(r.qty), 0)), align: "right" },
    { label: "Amount", value: fmtMoney(rows.reduce((s, r) => s + asNumber(r.amount), 0)), align: "right" },
  ],
};

const POS_PAYMENTS: ChildTableSpec = {
  tab: "Payments",
  key: "payments",
  label: "Payments",
  description: "Cash, card and other tenders taken at the counter.",
  doctype: "Sales Invoice Payment",
  columns: [req(link("mode_of_payment", "Mode of Payment", "Mode of Payment")), req(currency("amount", "Amount")), data("reference_no", "Reference"), ro(link("account", "Account", "Account"))],
  totals: (rows) => [{ label: "Paid", value: fmtMoney(rows.reduce((s, r) => s + asNumber(r.amount), 0)), align: "right" }],
};

export const POS_INVOICE_CONFIG: DocConfig = {
  doctype: "POS Invoice",
  base: "/pos/invoices",
  singular: "POS Invoice",
  plural: "POS Invoices",
  subtitle: "Counter sales — consolidated into sales invoices when the shift closes",
  icon: ShoppingCart,
  listHeaderExtra: (
    <a href="/app/posapp" target="_blank" rel="noreferrer"
      className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
      <ShoppingCart className="h-4 w-4" /> Open POS terminal
    </a>
  ),
  submittable: true,
  listFields: ["name", "customer", "customer_name", "posting_date", "pos_profile", "grand_total", "paid_amount", "is_return", "status", "consolidated_invoice", "docstatus", "modified"],
  columns: [
    nameCol("Invoice", (r) => r.customer_name || r.customer),
    dateCol("posting_date", "Date"),
    textCol("pos_profile", "POS Profile"),
    moneyCol("grand_total", "Total"),
    moneyCol("paid_amount", "Paid"),
    yesNoCol("is_return", "Type", "Return", "Sale"),
    statusCol("status", "Status", "Draft"),
  ],
  searchFields: ["name", "customer", "customer_name", "consolidated_invoice"],
  statusField: "status",
  statuses: ["Draft", "Paid", "Consolidated", "Return", "Credit Note Issued", "Submitted", "Cancelled"],
  dateField: "posting_date",
  dateLabel: "Posting date",
  sort: { key: "posting_date", dir: "desc" },
  fields: [
    tab("Invoice"),
    sec("Sale"),
    req(select("naming_series", "Series", ["ACC-PSINV-.FY.-"])),
    req(link("company", "Company", "Company")),
    req(date("posting_date", "Posting Date")),
    data("posting_time", "Posting Time"),
    colBreak(),
    link("customer", "Customer", "Customer"),
    ro(data("customer_name", "Customer Name")),
    link("pos_profile", "POS Profile", "POS Profile"),
    check("is_return", "Is Return"),
    when_ro_link(),
    sec("Pricing"),
    req(link("selling_price_list", "Price List", "Price List")),
    req(link("currency", "Currency", "Currency")),
    colBreak(),
    link("set_warehouse", "Source Warehouse", "Warehouse"),
    check("update_stock", "Update Stock"),
    tab("Items"),
    tab("Taxes & Totals"),
    sec("Taxes"),
    link("taxes_and_charges", "Tax Template", "Sales Taxes and Charges Template"),
    ro(currency("total_taxes_and_charges", "Total Taxes")),
    colBreak(),
    select("apply_discount_on", "Apply Discount On", ["", "Grand Total", "Net Total"]),
    float("additional_discount_percentage", "Additional Discount %"),
    currency("discount_amount", "Discount Amount"),
    sec("Totals"),
    ro(float("total_qty", "Total Qty")),
    ro(currency("net_total", "Net Total")),
    colBreak(),
    ro(currency("grand_total", "Grand Total")),
    ro(currency("rounded_total", "Rounded Total")),
    ro(data("in_words", "In Words")),
    tab("Payments"),
    sec("Settlement"),
    ro(currency("paid_amount", "Paid Amount")),
    currency("change_amount", "Change Amount"),
    colBreak(),
    ro(currency("outstanding_amount", "Outstanding")),
    currency("write_off_amount", "Write Off"),
    tab("More"),
    sec("References"),
    ro(link("consolidated_invoice", "Consolidated Into", "Sales Invoice")),
    link("project", "Project", "Project"),
    colBreak(),
    link("cost_center", "Cost Center", "Cost Center"),
    req(link("debit_to", "Debit To", "Account")),
    sec("Remarks"),
    text("remarks", "Remarks"),
  ],
  children: [POS_ITEMS, POS_PAYMENTS],
  tabIcons: { Invoice: ReceiptText, Items: ShoppingCart, "Taxes & Totals": Coins, Payments: Banknote, More: SlidersHorizontal },
  actions: [
    { label: "Make Return", icon: Undo2, group: "create", show: (c) => c.docstatus === 1 && !c.values.is_return, make: "erpnext.accounts.doctype.pos_invoice.pos_invoice.make_sales_return" },
  ],
  defaults: ({ company }) => ({ company, naming_series: "ACC-PSINV-.FY.-", posting_date: todayISO(), is_pos: 1, update_stock: 1 }),
  summary: (v) => [
    { label: "Grand total", value: fmtMoney(v.grand_total), tone: "emerald" },
    { label: "Paid", value: fmtMoney(v.paid_amount), tone: "sky" },
    { label: "Change", value: fmtMoney(v.change_amount), tone: "amber" },
    { label: "Consolidated", value: v.consolidated_invoice || "Not yet", tone: v.consolidated_invoice ? "indigo" : "rose" },
  ],
  titleOf: (v) => (v.name ? `${v.name}${v.customer_name ? ` · ${v.customer_name}` : ""}` : "New POS Invoice"),
};

/** Return reference: read-only link shown only on returns. */
function when_ro_link() {
  return { ...ro(link("return_against", "Return Against", "POS Invoice")), showIf: (v: Record<string, any>) => Boolean(v.is_return) };
}

/* ============================================================================ POS Opening / Closing */

export const POS_OPENING_CONFIG: DocConfig = {
  doctype: "POS Opening Entry",
  base: "/pos/openings",
  singular: "POS Opening Entry",
  plural: "Shift Openings",
  subtitle: "Cash float counted when a cashier starts a shift",
  icon: DoorOpen,
  submittable: true,
  listFields: ["name", "pos_profile", "user", "period_start_date", "posting_date", "status", "pos_closing_entry", "docstatus", "modified"],
  columns: [nameCol("Opening", (r) => r.user), textCol("pos_profile", "POS Profile"), dateTimeCol("period_start_date", "Shift Start"), textCol("pos_closing_entry", "Closed By"), statusCol("status", "Status", "Draft")],
  searchFields: ["name", "pos_profile", "user"],
  statusField: "status",
  statuses: ["Draft", "Open", "Closed", "Cancelled"],
  dateField: "posting_date",
  fields: [
    sec("Shift"),
    req(link("company", "Company", "Company")),
    req(link("pos_profile", "POS Profile", "POS Profile")),
    req(link("user", "Cashier", "User")),
    colBreak(),
    req(datetime("period_start_date", "Shift Start")),
    req(date("posting_date", "Posting Date")),
    ro(data("pos_closing_entry", "Closing Entry")),
  ],
  children: [{
    key: "balance_details",
    label: "Opening Balance",
    doctype: "POS Opening Entry Detail",
    minRows: 1,
    columns: [req(link("mode_of_payment", "Mode of Payment", "Mode of Payment")), currency("opening_amount", "Opening Amount")],
    totals: (rows) => [{ label: "Float", value: fmtMoney(rows.reduce((s, r) => s + asNumber(r.opening_amount), 0)), align: "right" }],
  }],
  defaults: ({ company }) => ({ company, posting_date: todayISO(), period_start_date: nowERPDateTime() }),
  titleOf: (v) => (v.name ? `${v.name} · ${v.user ?? ""}` : "New Shift Opening"),
};

export const POS_CLOSING_CONFIG: DocConfig = {
  doctype: "POS Closing Entry",
  base: "/pos/closings",
  singular: "POS Closing Entry",
  plural: "Shift Closings",
  subtitle: "End-of-shift cash-up: expected vs counted per payment mode",
  icon: DoorClosed,
  submittable: true,
  listFields: ["name", "pos_profile", "user", "period_start_date", "period_end_date", "grand_total", "total_quantity", "status", "docstatus", "modified"],
  columns: [nameCol("Closing", (r) => r.user), textCol("pos_profile", "POS Profile"), dateTimeCol("period_end_date", "Shift End"), numCol("total_quantity", "Qty", 0), moneyCol("grand_total", "Sales"), statusCol("status", "Status", "Draft")],
  searchFields: ["name", "pos_profile", "user"],
  statusField: "status",
  statuses: ["Draft", "Submitted", "Queued", "Failed", "Cancelled"],
  dateField: "posting_date",
  fields: [
    tab("Shift"),
    sec("Shift"),
    req(link("pos_opening_entry", "Opening Entry", "POS Opening Entry")),
    ro(link("pos_profile", "POS Profile", "POS Profile")),
    ro(link("user", "Cashier", "User")),
    colBreak(),
    ro(datetime("period_start_date", "Shift Start")),
    req(datetime("period_end_date", "Shift End")),
    req(date("posting_date", "Posting Date")),
    sec("Totals"),
    ro(float("total_quantity", "Total Qty")),
    ro(currency("net_total", "Net Total")),
    colBreak(),
    ro(currency("total_taxes_and_charges", "Taxes")),
    ro(currency("grand_total", "Grand Total")),
    tab("Cash-up"),
    tab("Invoices"),
    sec("Errors"),
    ro(text("error_message", "Failure Description")),
  ],
  children: [
    { tab: "Cash-up", key: "payment_reconciliation", label: "Payment Reconciliation", description: "Expected from the invoices vs what was counted.", doctype: "POS Closing Entry Detail",
      columns: [ro(link("mode_of_payment", "Mode of Payment", "Mode of Payment")), ro(currency("opening_amount", "Opening")), ro(currency("expected_amount", "Expected")), currency("closing_amount", "Counted"), ro(currency("difference", "Difference"))],
      derive: (r) => ({ ...r, difference: asNumber(r.closing_amount) - asNumber(r.expected_amount) }),
      totals: (rows) => [{ label: "Difference", value: fmtMoney(rows.reduce((s, r) => s + asNumber(r.closing_amount) - asNumber(r.expected_amount), 0)), align: "right" }] },
    { tab: "Invoices", key: "pos_invoices", label: "POS Invoices", doctype: "POS Invoice Reference", readOnly: true,
      columns: [link("pos_invoice", "POS Invoice", "POS Invoice"), date("posting_date", "Date"), link("customer", "Customer", "Customer"), currency("grand_total", "Total"), check("is_return", "Return")] },
    { tab: "Invoices", key: "taxes", label: "Taxes", doctype: "POS Closing Entry Taxes", readOnly: true, columns: [link("account_head", "Account", "Account"), currency("amount", "Amount")] },
  ],
  tabIcons: { Shift: CalendarClock, "Cash-up": Banknote, Invoices: ClipboardList },
  defaults: () => ({ posting_date: todayISO(), period_end_date: nowERPDateTime() }),
  titleOf: (v) => (v.name ? `${v.name} · ${v.user ?? ""}` : "New Shift Closing"),
};

export const POS_CONFIGS = [POS_INVOICE_CONFIG, POS_OPENING_CONFIG, POS_CLOSING_CONFIG];
