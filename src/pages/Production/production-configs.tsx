import { Cog, Layers, CalendarRange, Factory, ListChecks, Timer } from "lucide-react";
import type { DocConfig, ChildTableSpec } from "@/components/doc/doc-config";
import {
  sec, colBreak, data, date, datetime, int, float, currency, check, text, link, select, ro, req, when,
  nameCol, textCol, dateCol, dateTimeCol, numCol, moneyCol, statusCol, yesNoCol, progressCol, docstatusCol, fmt,
} from "@/components/doc/doc-helpers";
import { getLinkedValues, type Doc } from "@/hooks/useDoc";
import { postCall, postCallForDoc } from "@/services/frappe";
import { todayISO, nowERPDateTime } from "@/utils/dates";
import { asNumber } from "@/utils/cn";
import { computeBom, computeWorkOrder, totalBlend } from "./mfg-calc";

/** "YYYY-MM-DD HH:mm:ss" / "YYYY-MM-DDTHH:mm" → Date (local), or null. */
const parseDT = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
};
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDT = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Item → the fields a row/header needs (name, unit, and a starting rate). */
async function itemInfo(code: string) {
  const v = await getLinkedValues("Item", code, ["item_name", "stock_uom", "valuation_rate", "standard_rate", "description"]);
  return { name: v.item_name as string | undefined, uom: (v.stock_uom as string | undefined) ?? "Nos", rate: asNumber(v.valuation_rate) || asNumber(v.standard_rate), description: v.description as string | undefined };
}

/* ============================================================================ Workstation */

const WORKSTATION_COSTS: ChildTableSpec = {
  key: "workstation_costs",
  label: "Operating Components Cost",
  description: "What one hour on this workstation costs — the net hour rate is the sum of these.",
  doctype: "Workstation Cost",
  columns: [req(link("operating_component", "Operating Component", "Workstation Operating Component")), req(currency("operating_cost", "Operating Cost"))],
  newRow: () => ({ operating_cost: 0 }),
  totals: (rows) => [{ label: "Net hour rate", value: fmt(rows.reduce((s, r) => s + asNumber(r.operating_cost), 0)), align: "right" }],
};

export const WORKSTATION_CONFIG: DocConfig = {
  doctype: "Workstation",
  base: "/production/workstations",
  singular: "Workstation",
  plural: "Workstations",
  subtitle: "Machines and work centres, their capacity and hourly cost",
  icon: Cog,
  companyScoped: false,
  listFields: ["name", "workstation_name", "workstation_type", "plant_floor", "status", "hour_rate", "production_capacity", "spindles", "shifts_per_day", "disabled", "modified"],
  columns: [
    nameCol("Workstation", (r) => r.workstation_type || undefined),
    textCol("plant_floor", "Plant Floor"),
    statusCol("status", "Status", "Off"),
    moneyCol("hour_rate", "Hour Rate"),
    numCol("production_capacity", "Job Capacity", 0),
    numCol("spindles", "Spindles", 0),
    yesNoCol("disabled", "Enabled", "Disabled", "Enabled"),
  ],
  searchFields: ["name", "workstation_name", "workstation_type", "plant_floor"],
  statusField: "status",
  statuses: ["Production", "Idle", "Setup", "Maintenance", "Problem", "Off"],
  fields: [
    sec("Workstation"),
    req(data("workstation_name", "Workstation Name")),
    link("workstation_type", "Workstation Type", "Workstation Type"),
    link("plant_floor", "Plant Floor", "Plant Floor"),
    colBreak(),
    select("status", "Status", ["Production", "Off", "Idle", "Problem", "Maintenance", "Setup"]),
    link("operation", "Operation", "Operation"),
    check("disabled", "Disabled"),
    sec("Capacity"),
    req(int("production_capacity", "Job Capacity")),
    req(int("spindles", "Spindles")),
    colBreak(),
    int("shifts_per_day", "Shifts Per Day"),
    req(int("out_of_order", "Out Of Order")),
    sec("People & Location"),
    link("warehouse", "Warehouse", "Warehouse"),
    link("holiday_list", "Holiday List", "Holiday List"),
    colBreak(),
    link("operator", "Operator", "Employee"),
    link("assistant", "Assistant", "Employee"),
    sec("Notes"),
    text("description", "Description"),
  ],
  children: [WORKSTATION_COSTS],
  defaults: () => ({ status: "Off", production_capacity: 1, spindles: 0, out_of_order: 0, shifts_per_day: 3 }),
  summary: (v, rows) => [
    { label: "Net hour rate", value: fmt((rows.workstation_costs ?? []).reduce((s, r) => s + asNumber(r.operating_cost), 0) || v.hour_rate), tone: "emerald" },
    { label: "Job capacity", value: fmt(v.production_capacity, 0), tone: "sky" },
    { label: "Spindles", value: fmt(v.spindles, 0), tone: "indigo" },
  ],
  titleOf: (v) => v.workstation_name || "New Workstation",
};

/* ============================================================================ BOM */

const BOM_ITEMS: ChildTableSpec = {
  key: "items",
  label: "Components",
  description: "Raw materials that go into one batch. For a Spinning BOM the blend ratio sets each quantity and the mix's yield.",
  doctype: "BOM Item",
  // Kept to the columns you actually type in so the grid fits without sideways scrolling; the read-only
  // helpers (name, UOM, gross-up quantity) and extras live in the row editor (pencil icon).
  columns: [
    req(link("item_code", "Item Code", "Item")),
    req(float("qty", "Qty")),
    { ...float("blend_ratio", "Blend %"), reqd: true },
    float("item_yield", "Yield %"),
    req(currency("rate", "Rate")),
    ro(currency("amount", "Amount")),
  ],
  dialogColumns: [
    data("item_name", "Item Name", { read_only: true }),
    req(link("uom", "UOM", "UOM")),
    ro(float("gross_up_qty", "Gross-up Qty")),
    link("source_warehouse", "Source Warehouse", "Warehouse"),
    check("allow_alternative_item", "Allow Alternative Item"),
    check("do_not_explode", "Do Not Explode"),
    text("description", "Description"),
  ],
  newRow: (_v, rows) => ({ qty: 1, rate: 0, uom: "Nos", conversion_factor: 1, blend_ratio: rows.length === 0 ? 100 : 0, item_yield: 0 }),
  linkEffects: {
    item_code: async (code) => {
      const i = await itemInfo(code);
      return { item_name: i.name ?? code, uom: i.uom, stock_uom: i.uom, conversion_factor: 1, rate: i.rate, description: i.description };
    },
  },
  totals: (rows) => [
    { label: "Blend total", value: `${fmt(totalBlend(rows))} %`, align: "right" },
    { label: "Amount", value: fmt(rows.reduce((s, r) => s + asNumber(r.amount), 0)), align: "right" },
  ],
};

const BOM_OPERATIONS: ChildTableSpec = {
  key: "operations",
  label: "Operations",
  description: "Routing steps — used when \"With Operations\" is on.",
  doctype: "BOM Operation",
  columns: [
    req(link("operation", "Operation", "Operation")),
    link("workstation", "Workstation", "Workstation"),
    req(float("time_in_mins", "Time (mins)")),
    currency("hour_rate", "Hour Rate"),
    ro(currency("operating_cost", "Operating Cost")),
  ],
  dialogColumns: [link("workstation_type", "Workstation Type", "Workstation Type"), float("batch_size", "Batch Size"), check("fixed_time", "Fixed Time"), text("description", "Description")],
  newRow: () => ({ time_in_mins: 0 }),
  linkEffects: {
    workstation: async (ws) => {
      const v = await getLinkedValues("Workstation", ws, ["hour_rate"]);
      return { hour_rate: asNumber(v.hour_rate) };
    },
  },
};

const BOM_SECONDARY: ChildTableSpec = {
  key: "secondary_items",
  label: "Secondary Items",
  description: "Scrap, by-products and co-products this BOM also produces.",
  doctype: "BOM Secondary Item",
  columns: [
    req(link("item_code", "Item Code", "Item")),
    data("item_name", "Item Name", { read_only: true }),
    req(select("secondary_item_type", "Type", ["Co-Product", "By-Product", "Scrap", "Additional Finished Good"])),
    float("qty", "Qty"),
    req(link("uom", "UOM", "UOM")),
    select("valuation_type", "Valuation", ["Valuation Rate", "% of Component Cost", "Manual"]),
    currency("cost", "Cost"),
  ],
  newRow: () => ({ secondary_item_type: "Scrap", qty: 1, uom: "Nos", stock_uom: "Nos", conversion_factor: 1, valuation_type: "Manual", cost_allocation_per: 0, process_loss_per: 0, cost: 0, base_cost: 0, process_loss_qty: 0 }),
  linkEffects: {
    item_code: async (code) => {
      const i = await itemInfo(code);
      return { item_name: i.name ?? code, uom: i.uom, stock_uom: i.uom };
    },
  },
};

export const BOM_CONFIG: DocConfig = {
  doctype: "BOM",
  base: "/production/boms",
  singular: "BOM",
  plural: "Bills of Materials",
  subtitle: "What goes into a product — components, blend ratios, operations and cost",
  icon: Layers,
  submittable: true,
  listFields: ["name", "item", "item_name", "bom_type", "quantity", "uom", "is_active", "is_default", "total_cost", "target_yield", "docstatus", "modified"],
  columns: [
    nameCol("BOM", (r) => r.item_name || r.item),
    textCol("bom_type", "Type"),
    numCol("quantity", "Qty", 3),
    numCol("target_yield", "Yield %", 2),
    moneyCol("total_cost", "Total Cost"),
    yesNoCol("is_active", "Active", "Active", "Inactive"),
    yesNoCol("is_default", "Default", "Default", "—"),
    docstatusCol(),
  ],
  searchFields: ["name", "item", "item_name", "bom_type"],
  filters: [{ field: "bom_type", label: "BOM Type", options: ["Spinning", "Weaving", "Dyeing", "Cutting", "Stitching", "Packing"] }],
  fields: [
    sec("Product"),
    req(link("item", "Item to Manufacture", "Item")),
    data("item_name", "Item Name", { read_only: true }),
    req(float("quantity", "Output Quantity")),
    link("uom", "Unit of Measure", "UOM", { read_only: true }),
    colBreak(),
    req(link("company", "Company", "Company")),
    req(link("currency", "Currency", "Currency")),
    req(float("conversion_rate", "Conversion Rate")),
    link("project", "Project", "Project"),
    sec("Status"),
    check("is_active", "Is Active"),
    check("is_default", "Is Default"),
    colBreak(),
    check("with_operations", "With Operations"),
    check("allow_alternative_item", "Allow Alternative Item"),

    sec("Spinning"),
    select("bom_type", "BOM Type", ["", "Spinning", "Weaving", "Dyeing", "Cutting", "Stitching", "Packing"]),
    when(link("main_operation", "Main Operation", "Operation"), (v) => v.bom_type === "Spinning"),
    when(float("target_ops", "Target OPS"), (v) => v.bom_type === "Spinning"),
    when(float("invisible_lose_percentage", "Invisible Loss %"), (v) => v.bom_type === "Spinning"),
    colBreak(),
    when(ro(float("target_yield", "Target Yield %")), (v) => v.bom_type === "Spinning"),
    when(ro(float("material_required", "Material Required")), (v) => v.bom_type === "Spinning"),
    when(ro(float("material_issued", "Material Issued")), (v) => v.bom_type === "Spinning"),
    when(ro(float("target_waste_percentage", "Target Waste %")), (v) => v.bom_type === "Spinning"),
    when(ro(float("target_waste", "Target Waste")), (v) => v.bom_type === "Spinning"),
    when(ro(float("invisible_lose_qty", "Invisible Loss Qty")), (v) => v.bom_type === "Spinning"),
    sec("Machines"),
    when(ro(float("spindle_required", "Spindles Required")), (v) => v.bom_type === "Spinning"),
    when(ro(float("frame_required", "Frames Required")), (v) => v.bom_type === "Spinning"),
    when(ro(float("per_shift_frame_required", "Frames Per Shift")), (v) => v.bom_type === "Spinning"),

    sec("Warehouses"),
    link("default_source_warehouse", "Default Source Warehouse", "Warehouse"),
    colBreak(),
    link("default_target_warehouse", "Default Target Warehouse", "Warehouse"),
    sec("Costing"),
    ro(currency("raw_material_cost", "Raw Material Cost")),
    ro(currency("operating_cost", "Operating Cost")),
    colBreak(),
    ro(currency("secondary_items_cost", "Secondary Items Cost")),
    ro(currency("total_cost", "Total Cost")),
  ],
  children: [{ ...BOM_ITEMS, minRows: 1 }, BOM_OPERATIONS, BOM_SECONDARY],
  defaults: ({ company }) => ({ company, quantity: 1, currency: "PKR", conversion_rate: 1, is_active: 1, is_default: 0, with_operations: 0 }),
  linkEffects: {
    item: async (item) => {
      const i = await itemInfo(item);
      return { item_name: i.name ?? item, uom: i.uom };
    },
    company: async (company) => {
      const v = await getLinkedValues("Company", company, ["default_currency"]);
      return v.default_currency ? { currency: v.default_currency, conversion_rate: 1 } : undefined;
    },
  },
  compute: (v, rows) => {
    const out = computeBom(v, rows.items ?? []);
    return { values: out.values, rows: { items: out.rows ?? rows.items ?? [] } };
  },
  summary: (v, rows) => {
    const blend = totalBlend(rows.items ?? []);
    return [
      { label: "Output", value: `${fmt(v.quantity, 3)} ${v.uom ?? ""}`.trim(), tone: "sky" },
      { label: "Components", value: (rows.items ?? []).length, tone: "indigo" },
      ...(v.bom_type === "Spinning"
        ? [
            { label: "Blend total", value: `${fmt(blend)} %`, tone: (Math.abs(blend - 100) < 0.01 ? "emerald" : "amber") as "emerald" | "amber" },
            { label: "Target yield", value: `${fmt(v.target_yield)} %`, tone: "teal" as const },
          ]
        : []),
      { label: "Total cost", value: fmt(v.total_cost), tone: "emerald" },
    ];
  },
  validate: (v, rows) => {
    const errs: Record<string, string> = {};
    const items = rows.items ?? [];
    if (v.bom_type === "Spinning" && items.some((r) => asNumber(r.blend_ratio) > 0) && Math.abs(totalBlend(items) - 100) > 0.01) {
      errs.blend = `Blend ratios add up to ${fmt(totalBlend(items))} %, not 100 %`;
    }
    return errs;
  },
  titleOf: (v) => (v.name ? String(v.name) : "New BOM"),
};

/* ============================================================================ Work Order */

const WORK_ORDER_ITEMS: ChildTableSpec = {
  key: "required_items",
  label: "Required Items",
  description: "Materials this order consumes — loaded from the BOM, adjust if needed.",
  doctype: "Work Order Item",
  columns: [
    link("item_code", "Item", "Item"),
    ro(data("item_name", "Item Name")),
    link("source_warehouse", "Source Warehouse", "Warehouse"),
    float("required_qty", "Required Qty"),
    ro(float("transferred_qty", "Transferred")),
    ro(float("consumed_qty", "Consumed")),
    ro(float("blend_ratio", "Blend %")),
    ro(currency("rate", "Rate")),
    ro(currency("amount", "Amount")),
  ],
  newRow: () => ({ required_qty: 1, include_item_in_manufacturing: 1 }),
  linkEffects: {
    item_code: async (code) => {
      const i = await itemInfo(code);
      return { item_name: i.name ?? code, stock_uom: i.uom, rate: i.rate, description: i.description };
    },
  },
};

const WORK_ORDER_OPERATIONS: ChildTableSpec = {
  key: "operations",
  label: "Operations",
  doctype: "Work Order Operation",
  columns: [
    req(link("operation", "Operation", "Operation")),
    link("workstation", "Workstation", "Workstation"),
    req(float("time_in_mins", "Time (mins)")),
    select("status", "Status", ["Pending", "Work in Progress", "Completed"]),
    float("completed_qty", "Completed Qty"),
    ro(currency("planned_operating_cost", "Planned Cost")),
    ro(currency("actual_operating_cost", "Actual Cost")),
  ],
  dialogColumns: [link("bom", "BOM", "BOM"), link("source_warehouse", "Source Warehouse", "Warehouse"), link("wip_warehouse", "WIP Warehouse", "Warehouse"), link("fg_warehouse", "FG Warehouse", "Warehouse")],
  newRow: () => ({ status: "Pending", time_in_mins: 0, completed_qty: 0 }),
};

const WORK_ORDER_WORKSTATIONS: ChildTableSpec = {
  key: "workstations",
  label: "Workstations",
  description: "Spindles allocated and downtime per machine (maintained by the system).",
  doctype: "Work Order Workstations",
  readOnly: true,
  columns: [ro(link("workstation", "Workstation", "Workstation")), ro(float("spindles_allocated", "Spindles Allocated")), ro(float("downtime", "Downtime (mins)"))],
};

/** BOM → the rows and targets a Work Order starts from (the desk's "get items and operations from BOM"). */
async function loadFromBom(bom: string, v: Doc) {
  const targets = await getLinkedValues("BOM", bom, ["target_yield", "target_waste_percentage", "target_ops", "bom_type"]);
  const patch: Doc = {};
  if (targets.bom_type === "Spinning") {
    patch.target_yield = targets.target_yield;
    patch.target_waste_percentage = targets.target_waste_percentage;
    patch.target_ops = targets.target_ops;
  }
  if (v.production_item && v.company && asNumber(v.qty) > 0) {
    const loaded = await postCallForDoc<Doc>("get_items_and_operations_from_bom", {
      doctype: "Work Order",
      production_item: v.production_item,
      bom_no: bom,
      qty: v.qty,
      company: v.company,
      use_multi_level_bom: v.use_multi_level_bom ?? 1,
      project: v.project,
      source_warehouse: v.source_warehouse,
      wip_warehouse: v.wip_warehouse,
      required_items: [],
      operations: [],
    });
    if (loaded?.required_items) patch.required_items = loaded.required_items;
    if (loaded?.operations) patch.operations = loaded.operations;
  }
  return patch;
}

export const WORK_ORDER_CONFIG: DocConfig = {
  doctype: "Work Order",
  base: "/production/work-orders",
  singular: "Work Order",
  plural: "Work Orders",
  subtitle: "Production orders — what to make, from which BOM, on which machines",
  icon: Factory,
  submittable: true,
  listFields: ["name", "production_item", "item_name", "qty", "produced_qty", "status", "planned_start_date", "planned_end_date", "bom_no", "sales_order", "production_plan", "docstatus", "modified"],
  columns: [
    nameCol("Work Order", (r) => r.item_name || r.production_item),
    textCol("bom_no", "BOM"),
    progressCol("produced_qty", "qty", "Produced"),
    dateTimeCol("planned_start_date", "Planned Start"),
    textCol("sales_order", "Sales Order"),
    statusCol("status", "Status", "Draft"),
  ],
  searchFields: ["name", "production_item", "item_name", "bom_no", "sales_order", "production_plan"],
  statusField: "status",
  statuses: ["Draft", "Not Started", "In Process", "Completed", "Stopped", "Closed", "Cancelled"],
  dateField: "planned_start_date",
  dateLabel: "Planned start",
  sort: { key: "planned_start_date", dir: "desc" },
  fields: [
    sec("Order"),
    req(select("naming_series", "Series", ["MFG-WO-.YYYY.-"])),
    req(link("company", "Company", "Company")),
    req(link("production_item", "Item To Manufacture", "Item")),
    ro(data("item_name", "Item Name")),
    colBreak(),
    req(link("bom_no", "BOM No", "BOM")),
    req(float("qty", "Qty To Manufacture")),
    link("sales_order", "Sales Order", "Sales Order"),
    link("project", "Project", "Project"),
    ro(link("production_plan", "Production Plan", "Production Plan")),

    sec("Schedule"),
    req(datetime("planned_start_date", "Planned Start")),
    datetime("planned_end_date", "Planned End"),
    date("expected_delivery_date", "Expected Delivery"),
    colBreak(),
    datetime("actual_start_date", "Actual Start", { read_only: true }),
    datetime("actual_end_date", "Actual End", { read_only: true }),
    ro(date("work_order_date", "Work Order Date")),

    sec("Warehouses"),
    link("source_warehouse", "Source Warehouse", "Warehouse"),
    link("wip_warehouse", "Work-in-Progress Warehouse", "Warehouse"),
    colBreak(),
    link("fg_warehouse", "Target Warehouse", "Warehouse"),
    link("scrap_warehouse", "Scrap Warehouse", "Warehouse"),

    sec("Spinning — plan"),
    req(int("spindle_allocated", "Spindles Allocated")),
    ro(float("target_yield", "Target Yield %")),
    ro(float("target_waste_percentage", "Target Waste %")),
    ro(float("target_ops", "Target OPS")),
    colBreak(),
    ro(float("material_issued", "Material To Issue")),
    ro(float("spindle_required", "Spindles Required")),
    ro(float("frame_required", "Frames Required")),

    sec("Spinning — actual"),
    ro(float("produced_qty", "Manufactured Qty")),
    ro(float("actual_yield", "Actual Yield %")),
    ro(float("actual_waste", "Actual Waste")),
    ro(float("actual_waste_percentage", "Actual Waste %")),
    colBreak(),
    ro(float("actual_ops", "Actual OPS")),
    ro(float("spindle_worked", "Spindles Worked")),
    ro(float("actual_frame_required", "Frames Worked")),
    ro(float("total_downtime", "Total Downtime")),

    sec("Options"),
    check("use_multi_level_bom", "Use Multi-Level BOM"),
    check("skip_transfer", "Skip Material Transfer to WIP"),
    colBreak(),
    check("allow_alternative_item", "Allow Alternative Item"),
    check("reserve_stock", "Reserve Stock"),

    sec("Costing"),
    ro(currency("planned_operating_cost", "Planned Operating Cost")),
    currency("additional_operating_cost", "Additional Operating Cost"),
    colBreak(),
    ro(currency("actual_operating_cost", "Actual Operating Cost")),
    ro(currency("total_operating_cost", "Total Operating Cost")),
  ],
  children: [WORK_ORDER_ITEMS, WORK_ORDER_OPERATIONS, WORK_ORDER_WORKSTATIONS],
  defaults: ({ company }) => ({ company, naming_series: "MFG-WO-.YYYY.-", qty: 1, use_multi_level_bom: 1, spindle_allocated: 0, work_order_date: todayISO(), planned_start_date: nowERPDateTime() }),
  linkEffects: {
    production_item: async (item, v) => {
      const d = await postCall<Doc>("erpnext.manufacturing.doctype.work_order.work_order.get_item_details", { item, project: v.project }).catch(() => undefined);
      const i = await itemInfo(item);
      return { item_name: i.name ?? item, stock_uom: i.uom, description: i.description, ...(d?.bom_no ? { bom_no: d.bom_no } : {}) };
    },
    bom_no: (bom, v) => loadFromBom(bom, v),
  },
  compute: (v) => {
    const patch = computeWorkOrder(v);
    // With no operations the server can't derive an end date (the desk fills one in), and an order with no end
    // — or one before its start — is rejected. Keep it at least a day after the start.
    const start = parseDT(v.planned_start_date);
    const end = parseDT(v.planned_end_date);
    if (start && (!end || end < start)) patch.planned_end_date = fmtDT(new Date(start.getTime() + 24 * 3600 * 1000));
    return { values: patch };
  },
  summary: (v) => {
    const qty = asNumber(v.qty);
    const done = asNumber(v.produced_qty);
    return [
      { label: "Quantity", value: fmt(qty), tone: "sky" },
      { label: "Produced", value: fmt(done), tone: "emerald" },
      { label: "Balance", value: fmt(Math.max(0, qty - done)), tone: "amber" },
      { label: "Progress", value: `${fmt(qty > 0 ? Math.min(100, (done / qty) * 100) : 0, 0)} %`, tone: "teal" },
      ...(asNumber(v.spindle_required) > 0 ? [{ label: "Spindles", value: fmt(v.spindle_required, 0), tone: "indigo" as const }] : []),
    ];
  },
  titleOf: (v) => (v.name ? String(v.name) : "New Work Order"),
};

/* ============================================================================ Production Plan */

export const PRODUCTION_PLAN_CONFIG: DocConfig = {
  doctype: "Production Plan",
  base: "/production/production-plans",
  singular: "Production Plan",
  plural: "Production Plans",
  subtitle: "Plan what to produce from sales orders and material requests",
  icon: CalendarRange,
  submittable: true,
  listFields: ["name", "posting_date", "status", "total_planned_qty", "total_produced_qty", "get_items_from", "docstatus", "modified"],
  columns: [
    nameCol("Production Plan"),
    dateCol("posting_date", "Date"),
    textCol("get_items_from", "Items From"),
    progressCol("total_produced_qty", "total_planned_qty", "Produced"),
    statusCol("status", "Status", "Draft"),
  ],
  searchFields: ["name", "get_items_from", "status"],
  statusField: "status",
  statuses: ["Draft", "Submitted", "Not Started", "In Process", "Completed", "Closed", "Stopped", "Cancelled"],
  dateField: "posting_date",
  dateLabel: "Posting date",
  sort: { key: "posting_date", dir: "desc" },
  fields: [
    sec("Plan"),
    req(select("naming_series", "Series", ["MFG-PP-.YYYY.-"])),
    req(link("company", "Company", "Company")),
    req(date("posting_date", "Posting Date")),
    colBreak(),
    select("get_items_from", "Get Items From", ["", "Sales Order", "Material Request"]),
    link("for_warehouse", "Raw Materials Warehouse", "Warehouse"),
    link("sub_assembly_warehouse", "Sub Assembly Warehouse", "Warehouse"),
    sec("Options"),
    check("include_non_stock_items", "Include Non Stock Items"),
    check("include_subcontracted_items", "Include Subcontracted Items"),
    colBreak(),
    check("ignore_existing_ordered_qty", "Consider Projected Qty (raw materials)"),
    check("reserve_stock", "Reserve Stock"),
    sec("Totals"),
    ro(float("total_planned_qty", "Total Planned Qty")),
    colBreak(),
    ro(float("total_produced_qty", "Total Produced Qty")),
  ],
  children: [
    {
      key: "po_items",
      label: "Assembly Items",
      description: "What this plan produces.",
      doctype: "Production Plan Item",
      minRows: 1,
      columns: [
        req(link("item_code", "Item Code", "Item")),
        req(link("bom_no", "BOM No", "BOM")),
        req(float("planned_qty", "Planned Qty")),
        link("warehouse", "FG Warehouse", "Warehouse"),
        req(datetime("planned_start_date", "Planned Start")),
        ro(float("produced_qty", "Produced")),
        ro(float("pending_qty", "Pending")),
        ro(data("sales_order", "Sales Order")),
      ],
      dialogColumns: [check("include_exploded_items", "Include Exploded Items"), float("ops", "OPS"), float("frame_allocated_per_day", "Frames Allocated Per Day")],
      newRow: () => ({ planned_qty: 1, include_exploded_items: 1, planned_start_date: nowERPDateTime() }),
      linkEffects: {
        item_code: async (code) => {
          const i = await itemInfo(code);
          const bom = await postCall<Doc>("erpnext.manufacturing.doctype.work_order.work_order.get_item_details", { item: code }).catch(() => undefined);
          return { item_name: i.name ?? code, stock_uom: i.uom, description: i.description, ...(bom?.bom_no ? { bom_no: bom.bom_no } : {}) };
        },
      },
      totals: (rows) => [{ label: "Planned qty", value: fmt(rows.reduce((s, r) => s + asNumber(r.planned_qty), 0)), align: "right" }],
    },
    {
      key: "sales_orders",
      label: "Sales Orders",
      doctype: "Production Plan Sales Order",
      columns: [req(link("sales_order", "Sales Order", "Sales Order")), ro(date("sales_order_date", "Order Date")), ro(link("customer", "Customer", "Customer")), ro(currency("grand_total", "Grand Total"))],
      linkEffects: {
        sales_order: async (so) => {
          const v = await getLinkedValues("Sales Order", so, ["transaction_date", "customer", "grand_total"]);
          return { sales_order_date: v.transaction_date, customer: v.customer, grand_total: v.grand_total };
        },
      },
    },
    {
      key: "mr_items",
      label: "Raw Materials",
      description: "Material requests to raise for this plan.",
      doctype: "Material Request Plan Item",
      columns: [
        req(link("item_code", "Item Code", "Item")),
        req(link("warehouse", "For Warehouse", "Warehouse")),
        req(float("quantity", "Required Qty")),
        select("material_request_type", "Type", ["Purchase", "Material Transfer", "Material Issue", "Manufacture"]),
        date("schedule_date", "Required By"),
        ro(float("projected_qty", "Projected Qty")),
      ],
      newRow: () => ({ quantity: 1, material_request_type: "Purchase" }),
    },
    {
      key: "workstation_allocation",
      label: "Workstation Allocation",
      description: "Machine capacity reserved for each item.",
      doctype: "Workstation Allocation",
      columns: [req(link("item_code", "Item", "Item")), req(link("workstation", "Workstation", "Workstation")), ro(float("capacity", "Capacity")), req(float("allocated", "Allocated")), req(date("from_date", "From")), req(date("to_date", "To"))],
      newRow: () => ({ allocated: 0 }),
      wide: true,
    },
  ],
  defaults: ({ company }) => ({ company, naming_series: "MFG-PP-.YYYY.-", posting_date: todayISO() }),
  summary: (v) => {
    const planned = asNumber(v.total_planned_qty);
    const done = asNumber(v.total_produced_qty);
    return [
      { label: "Planned", value: fmt(planned), tone: "sky" },
      { label: "Produced", value: fmt(done), tone: "emerald" },
      { label: "Progress", value: `${fmt(planned > 0 ? Math.min(100, (done / planned) * 100) : 0, 0)} %`, tone: "teal" },
    ];
  },
  titleOf: (v) => (v.name ? String(v.name) : "New Production Plan"),
};

/* ============================================================================ Job Card */

export const JOB_CARD_CONFIG: DocConfig = {
  doctype: "Job Card",
  base: "/production/job-cards",
  singular: "Job Card",
  plural: "Job Cards",
  subtitle: "Shop-floor tracking of each operation on a work order",
  icon: ListChecks,
  submittable: true,
  listFields: ["name", "work_order", "production_item", "operation", "workstation", "for_quantity", "total_completed_qty", "status", "posting_date", "docstatus", "modified"],
  columns: [
    nameCol("Job Card", (r) => r.production_item),
    textCol("work_order", "Work Order"),
    textCol("operation", "Operation"),
    textCol("workstation", "Workstation"),
    progressCol("total_completed_qty", "for_quantity", "Completed"),
    statusCol("status", "Status", "Open"),
  ],
  searchFields: ["name", "work_order", "production_item", "operation", "workstation"],
  statusField: "status",
  statuses: ["Open", "Work In Progress", "Material Transferred", "On Hold", "Completed", "Submitted", "Cancelled"],
  dateField: "posting_date",
  dateLabel: "Posting date",
  fields: [
    sec("Job"),
    req(select("naming_series", "Series", ["PO-JOB.#####"])),
    req(link("company", "Company", "Company")),
    date("posting_date", "Posting Date"),
    req(link("work_order", "Work Order", "Work Order")),
    ro(link("production_item", "Final Product", "Item")),
    colBreak(),
    req(link("operation", "Operation", "Operation")),
    req(link("workstation", "Workstation", "Workstation")),
    link("workstation_type", "Workstation Type", "Workstation Type"),
    float("for_quantity", "Qty To Manufacture"),
    sec("Schedule"),
    datetime("expected_start_date", "Expected Start"),
    datetime("expected_end_date", "Expected End"),
    float("time_required", "Expected Time (mins)"),
    colBreak(),
    ro(datetime("actual_start_date", "Actual Start")),
    ro(datetime("actual_end_date", "Actual End")),
    ro(float("total_time_in_mins", "Total Time (mins)")),
    sec("Warehouses"),
    link("source_warehouse", "Source Warehouse", "Warehouse"),
    link("wip_warehouse", "WIP Warehouse", "Warehouse"),
    colBreak(),
    link("target_warehouse", "Target Warehouse", "Warehouse"),
    link("project", "Project", "Project"),
    sec("Progress"),
    ro(float("total_completed_qty", "Total Completed Qty")),
    ro(float("pending_qty", "Pending Qty")),
    colBreak(),
    ro(select("status", "Status", ["Open", "Work In Progress", "Material Transferred", "On Hold", "Submitted", "Cancelled", "Completed"])),
    text("remarks", "Remarks"),
  ],
  children: [
    {
      key: "time_logs",
      label: "Time Logs",
      description: "Who worked on this operation, when, and what they completed.",
      doctype: "Job Card Time Log",
      columns: [link("employee", "Employee", "Employee"), datetime("from_time", "From"), datetime("to_time", "To"), float("time_in_mins", "Time (mins)"), float("completed_qty", "Completed Qty")],
      newRow: () => ({ completed_qty: 0 }),
    },
  ],
  defaults: ({ company }) => ({ company, naming_series: "PO-JOB.#####", posting_date: todayISO() }),
  linkEffects: {
    work_order: async (wo) => {
      const v = await getLinkedValues("Work Order", wo, ["production_item", "qty", "wip_warehouse", "source_warehouse", "fg_warehouse"]);
      return { production_item: v.production_item, for_quantity: v.qty, wip_warehouse: v.wip_warehouse, source_warehouse: v.source_warehouse, target_warehouse: v.fg_warehouse };
    },
  },
  summary: (v) => [
    { label: "To manufacture", value: fmt(v.for_quantity), tone: "sky" },
    { label: "Completed", value: fmt(v.total_completed_qty), tone: "emerald" },
    { label: "Time (mins)", value: fmt(v.total_time_in_mins, 0), tone: "amber" },
  ],
  titleOf: (v) => (v.name ? String(v.name) : "New Job Card"),
};

/* ============================================================================ Downtime Entry */

const STOP_REASONS = ["Excessive machine set up time", "Unplanned machine maintenance", "On-machine press checks", "Machine operator errors", "Machine malfunction", "Electricity down", "Other"];

export const DOWNTIME_CONFIG: DocConfig = {
  doctype: "Downtime Entry",
  base: "/production/downtime",
  singular: "Downtime Entry",
  plural: "Downtime",
  subtitle: "Machine stoppages — what stopped, for how long, and why",
  icon: Timer,
  companyScoped: false,
  listFields: ["name", "workstation", "operator", "from_time", "to_time", "downtime", "stop_reason", "work_order", "modified"],
  columns: [
    nameCol("Entry", (r) => r.workstation),
    textCol("operator", "Operator"),
    dateTimeCol("from_time", "From"),
    dateTimeCol("to_time", "To"),
    numCol("downtime", "Downtime (mins)", 1),
    statusCol("stop_reason", "Reason", "Other"),
  ],
  searchFields: ["name", "workstation", "operator", "stop_reason", "work_order"],
  statusField: "stop_reason",
  statuses: STOP_REASONS,
  dateField: "from_time",
  dateLabel: "Stopped",
  sort: { key: "from_time", dir: "desc" },
  fields: [
    sec("Stoppage"),
    req(select("naming_series", "Series", ["DT-"])),
    req(link("workstation", "Workstation / Machine", "Workstation")),
    req(link("operator", "Operator", "Employee")),
    colBreak(),
    req(datetime("from_time", "From")),
    req(datetime("to_time", "To")),
    ro(float("downtime", "Downtime (mins)")),
    sec("Reason"),
    req(select("stop_reason", "Stop Reason", ["", ...STOP_REASONS])),
    ro(link("work_order", "Work Order", "Work Order")),
    colBreak(),
    text("remarks", "Remarks"),
  ],
  defaults: () => ({ naming_series: "DT-", from_time: nowERPDateTime(), to_time: nowERPDateTime() }),
  compute: (v) => {
    const a = v.from_time ? new Date(String(v.from_time).replace(" ", "T")).getTime() : NaN;
    const b = v.to_time ? new Date(String(v.to_time).replace(" ", "T")).getTime() : NaN;
    return Number.isFinite(a) && Number.isFinite(b) && b >= a ? { values: { downtime: (b - a) / 60000 } } : undefined;
  },
  summary: (v) => [{ label: "Downtime", value: `${fmt(v.downtime, 0)} min`, tone: "rose" }],
  titleOf: (v) => (v.name ? String(v.name) : "New Downtime Entry"),
};
