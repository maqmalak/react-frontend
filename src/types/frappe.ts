/**
 * Frappe / ERPNext TypeScript domain types.
 *
 * These map 1:1 to ERPNext standard DocTypes and the custom Apparel
 * Import/Export DocTypes defined in the `apparel` Frappe app.
 */

export interface FrappeMeta {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  idx: number;
  docstatus: 0 | 1 | 2;
  parent?: string | null;
  parentfield?: string | null;
  parenttype?: string | null;
}

/** A row type (child table) carries parent fields plus its row fields. */
export type ChildRow<T> = T & {
  name: string;
  idx: number;
  parent: string;
  parentfield: string;
  parenttype: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: 0 | 1 | 2;
};

// ---------------------------------------------------------------- LC Proforma

export interface LCProformaItem {
  item: string;
  item_name?: string;
  description?: string;
  buyer_style_no?: string;
  style_no?: string;
  color?: string;
  size?: string;
  hs_code?: string;
  country_of_origin?: string;
  quantity: number;
  uom?: string;
  rate: number;
  amount?: number;
  net_weight?: number;
  gross_weight?: number;
  cartons?: number;
    idx?: number;
}

// ------------------------------------------------------------- Export Shipment

export type ShipmentStatus =
  | "Planned"
  | "Booking"
  | "Stuffing"
  | "Shipped"
  | "In Transit"
  | "Arrived"
  | "Delivered"
  | "Closed";

export interface ExportShipment {
  shipment_no?: string;
  shipment_date?: string;
  customer: string;
  sales_order?: string;
  lc_proforma?: string;
  lc_no?: string;
  commercial_invoice_no?: string;
  packing_list_no?: string;
  bill_of_lading_no?: string;
  container_no?: string;
  shipping_line?: string;
  vessel?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  final_destination?: string;
  etd?: string;
  eta?: string;
  actual_shipment_date?: string;
  shipment_status?: ShipmentStatus;
  workflow_state?: string;
  name?: string;
}

// ------------------------------------------------------------- Import Shipment

export interface ImportShipment {
  shipment_no?: string;
  shipment_date?: string;
  supplier: string;
  purchase_order?: string;
  purchase_receipt?: string;
  import_cost_sheet?: string;
  bill_of_lading?: string;
  container_no?: string;
  shipping_line?: string;
  vessel?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  etd?: string;
  eta?: string;
  actual_arrival?: string;
  clearing_agent?: string;
  customs_declaration_no?: string;
  duty_amount?: number;
  tax_amount?: number;
  clearance_date?: string;
  shipment_status?: ShipmentStatus;
  workflow_state?: string;
  docstatus?: number;
  name?: string;
}

// ------------------------------------------------------- Import Cost Sheet Item

export interface ImportCostSheetItem {
  item: string;
  item_name?: string;
  quantity?: number;
  uom?: string;
  purchase_value?: number;
  freight?: number;
  insurance?: number;
  customs_duty?: number;
  additional_duty?: number;
  sales_tax?: number;
  regulatory_duty?: number;
  clearing_charges?: number;
  port_charges?: number;
  other_charges?: number;
  total_landed_cost?: number;
  landed_cost_per_unit?: number;
  idx?: number;
}

export interface ImportCostSheet {
  cost_sheet_date: string;
  company: string;
  supplier: string;
  purchase_order?: string;
  import_shipment?: string;
  purchase_receipt?: string;
  currency?: string;
  expense_account?: string;
  import_cost_sheet_items?: ImportCostSheetItem[];
  total_purchase_value?: number;
  total_landed_cost?: number;
  docstatus?: number;
  name?: string;
}

// ----------------------------------------------------------- Export Packing

export interface ExportPackingDetailsItem {
  carton_no?: string;
  item?: string;
  style?: string;
  color?: string;
  size?: string;
  quantity?: number;
  pieces_per_carton?: number;
  net_weight?: number;
  gross_weight?: number;
  dimensions?: string;
  volume_cbm?: number;
  idx?: number;
}

export interface ExportPackingDetails {
  packing_no?: string;
  packing_date?: string;
  sales_order: string;
  export_shipment?: string;
  customer?: string;
  lc_proforma?: string;
  export_packing_details?: ExportPackingDetailsItem[];
  total_cartons?: number;
  total_pieces?: number;
  total_net_weight?: number;
  total_gross_weight?: number;
  total_cbm?: number;
    name?: string;
}

export interface LCProforma {
  proforma_no?: string;
  proforma_date: string;
  company: string;
  customer: string;
  buyer_po_no?: string;
  export_order?: string;
  currency: string;
  exchange_rate?: number;
  lc_required?: boolean;
  lc_no?: string;
  lc_date?: string;
  lc_type?: string;
  lc_issuing_bank?: string;
  lc_advising_bank?: string;
  lc_confirming_bank?: string;
  lc_amount?: number;
  lc_currency?: string;
  lc_expiry_date?: string;
  lc_expiry_place?: string;
  latest_shipment_date?: string;
  partial_shipment_allowed?: boolean;
  transshipment_allowed?: boolean;
  port_of_loading?: string;
  port_of_discharge?: string;
  final_destination?: string;
  country_of_destination?: string;
  shipment_mode?: string;
  incoterm?: string;
  payment_terms?: string;
  beneficiary_bank?: string;
  bank_account?: string;
  swift_code?: string;
  bank_branch?: string;
  correspondent_bank?: string;
  lc_proforma_items?: LCProformaItem[];
  total_quantity?: number;
  total_cartons?: number;
  total_net_weight?: number;
  total_gross_weight?: number;
  total_proforma_value?: number;
  lc_status?: string;
  workflow_state?: string;
  amended_from?: string | null;
    name?: string;
}
// ------------------------------------------------------------- Purchase Order

export interface PurchaseOrderItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  received_qty?: number;
  rate?: number;
  amount?: number;
  uom?: string;
  stock_uom?: string;
  conversion_factor?: number;
  warehouse?: string;
  schedule_date?: string;
  idx?: number;
}

/**
 * Standard ERPNext Purchase Order (buying).
 * Child table fieldname is `items` (Purchase Order Item).
 */
export interface PurchaseOrder {
  name?: string;
  title?: string;
  naming_series?: string;
  supplier: string;
  supplier_name?: string;
  transaction_date: string;
  schedule_date?: string;
  company: string;
  currency: string;
  conversion_rate?: number;
  buying_price_list?: string;
  price_list_currency?: string;
  plc_conversion_rate?: number;
  status?: string;
  docstatus?: 0 | 1 | 2;
  per_received?: number;
  per_billed?: number;
  total_qty?: number;
  total?: number;
  net_total?: number;
  grand_total?: number;
  rounded_total?: number;
  base_grand_total?: number;
  taxes_and_charges?: string;
  apply_discount_on?: string;
  additional_discount_percentage?: number;
  discount_amount?: number;
  is_subcontracted?: 0 | 1 | boolean;
  set_warehouse?: string;
  supplier_warehouse?: string;
  incoterm?: string;
  named_place?: string;
  shipping_address?: string;
  billing_address?: string;
  payment_terms_template?: string;
  tc_name?: string;
  terms?: string;
  items?: PurchaseOrderItem[];
  amended_from?: string | null;
}

// ------------------------------------------------------------ Sales Order

export interface SalesOrderItem {
  item_code?: string;
  item_name?: string;
  description?: string;
  qty: number;
  delivered_qty?: number;
  produced_qty?: number;
  packed_qty?: number;
  rate?: number;
  amount?: number;
  uom?: string;
  style_no?: string;
  buyer_style_no?: string;
  buyer_color?: string;
  buyer_size?: string;
  season?: string;
  hs_code?: string;
  country_of_origin?: string;
  export_quantity?: number;
  carton_quantity?: number;
  net_weight?: number;
  gross_weight?: number;
  idx?: number;
}

/**
 * Standard ERPNext Sales Order plus the Apparel custom export fields added by
 * the `apparel` app (see install.py make_custom_fields).
 */
export interface SalesOrder {
  name: string;
  customer: string;
  customer_name?: string;
  transaction_date: string;
  delivery_date?: string;
  po_no?: string;
  buyer_po_no?: string;
  company: string;
  currency: string;
  conversion_rate?: number;
  grand_total?: number;
  total_qty?: number;
  status?: string;
  docstatus: 0 | 1 | 2;
  // Apparel custom fields
  export_status?: string;
  lc_proforma?: string;
  lc_no?: string;
  lc_date?: string;
  lc_issuing_bank?: string;
  lc_advising_bank?: string;
  lc_amount?: number;
  lc_currency?: string;
  lc_expiry_date?: string;
  latest_shipment_date?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  final_destination?: string;
  incoterm?: string;
  shipment_mode?: string;
  country_of_destination?: string;
  items?: SalesOrderItem[];
}

// ------------------------------------------------------------- Masters

export interface Item {
  name: string;
  item_code?: string;
  item_name?: string;
  item_group?: string;
  stock_uom?: string;
  standard_rate?: number;
  description?: string;
  disabled?: boolean;
  image?: string;
  color?: string;
  size?: string;
  style?: string;
  hs_code?: string;
}

export interface Customer {
  name: string;
  customer_name?: string;
  territory?: string;
  customer_group?: string;
  currency?: string;
  disabled?: boolean;
}

export interface Supplier {
  name: string;
  supplier_name?: string;
  supplier_group?: string;
  country?: string;
  disabled?: boolean;
}

export interface Company {
  name: string;
  company_name?: string;
  default_currency?: string;
  abbreviation?: string;
}

// ------------------------------------------------------------- Misc / users

export interface FrappeUserRoleRow {
  role: string;
}

export interface FrappeUser {
  name: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  user_image?: string;
  email?: string;
  language?: string;
  time_zone?: string;
  user_type?: string;
  enabled?: number;
  last_login?: string;
  creation?: string;
  /** Child table (`Has Role`) — only present when the full doc is loaded via get_doc. */
  roles?: FrappeUserRoleRow[];
  default_company?: string;
}

export interface FrappeRole {
  name: string;
  disabled?: 0 | 1;
  desk_access?: 0 | 1;
}

// ---------------------------------------------------- Purchase Receipt / Invoice

/** Standard ERPNext Purchase Receipt Item. Child fieldname is `items`. */
export interface PurchaseReceiptItem {
  item_code: string;
  item_name?: string;
  description?: string;
  received_qty?: number;
  qty: number;
  rejected_qty?: number;
  uom?: string;
  stock_uom?: string;
  conversion_factor?: number;
  rate?: number;
  amount?: number;
  warehouse?: string;
  rejected_warehouse?: string;
  quality_inspection?: string;
  purchase_order?: string;
  purchase_order_item?: string;
  schedule_date?: string;
  idx?: number;
}

/**
 * Standard ERPNext Purchase Receipt (buying / stock).
 * Child table fieldname is `items` (Purchase Receipt Item).
 */
export interface PurchaseReceipt {
  name?: string;
  naming_series?: string;
  supplier: string;
  supplier_name?: string;
  supplier_delivery_note?: string;
  posting_date: string;
  posting_time?: string;
  company: string;
  currency: string;
  conversion_rate?: number;
  buying_price_list?: string;
  set_warehouse?: string;
  supplier_warehouse?: string;
  taxes_and_charges?: string;
  apply_discount_on?: string;
  additional_discount_percentage?: number;
  discount_amount?: number;
  status?: string;
  docstatus?: 0 | 1 | 2;
  per_billed?: number;
  per_returned?: number;
  instructions?: string;
  total?: number;
  net_total?: number;
  grand_total?: number;
  rounded_total?: number;
  base_grand_total?: number;
  tc_name?: string;
  terms?: string;
  items?: PurchaseReceiptItem[];
  amended_from?: string | null;
}

/** Standard ERPNext Purchase Invoice Item. Child fieldname is `items`. */
export interface PurchaseInvoiceItem {
  item_code: string;
  item_name?: string;
  description?: string;
  received_qty?: number;
  qty: number;
  rejected_qty?: number;
  uom?: string;
  stock_uom?: string;
  conversion_factor?: number;
  rate?: number;
  amount?: number;
  warehouse?: string;
  rejected_warehouse?: string;
  quality_inspection?: string;
  expense_account?: string;
  purchase_order?: string;
  po_detail?: string;
  purchase_receipt?: string;
  pr_detail?: string;
  idx?: number;
}

/**
 * Standard ERPNext Purchase Invoice (accounts / buying).
 * Child table fieldname is `items` (Purchase Invoice Item).
 */
export interface PurchaseInvoice {
  name?: string;
  naming_series?: string;
  supplier: string;
  supplier_name?: string;
  posting_date: string;
  due_date?: string;
  is_paid?: 0 | 1 | boolean;
  update_stock?: 0 | 1 | boolean;
  on_hold?: 0 | 1 | boolean;
  company: string;
  cost_center?: string;
  bill_no?: string;
  bill_date?: string;
  currency: string;
  conversion_rate?: number;
  buying_price_list?: string;
  set_warehouse?: string;
  rejected_warehouse?: string;
  taxes_and_charges?: string;
  apply_discount_on?: string;
  additional_discount_percentage?: number;
  discount_amount?: number;
  total?: number;
  net_total?: number;
  grand_total?: number;
  rounded_total?: number;
  outstanding_amount?: number;
  payment_terms_template?: string;
  tc_name?: string;
  terms?: string;
  credit_to?: string;
  status?: string;
  docstatus?: 0 | 1 | 2;
  items?: PurchaseInvoiceItem[];
  amended_from?: string | null;
}

// ----------------------------------------------------------------- GL Entry

/** Standard ERPNext General Ledger Entry (accounting journal row). */
export interface GLEntry {
  name: string;
  posting_date?: string;
  account?: string;
  party_type?: string;
  party?: string;
  cost_center?: string;
  debit?: number;
  credit?: number;
  account_currency?: string;
  debit_in_account_currency?: number;
  credit_in_account_currency?: number;
  against?: string;
  against_voucher_type?: string;
  against_voucher?: string;
  voucher_type?: string;
  voucher_no?: string;
  remarks?: string;
  is_cancelled?: 0 | 1 | boolean;
}

// ------------------------------------------------------------- Payment Entry

/** Standard ERPNext Payment Entry (subset used for connection panels). */
export interface PaymentEntry {
  name: string;
  payment_type?: string;
  posting_date?: string;
  company?: string;
  party_type?: string;
  party?: string;
  party_name?: string;
  paid_amount?: number;
  received_amount?: number;
  reference_no?: string;
  reference_date?: string;
  mode_of_payment?: string;
  status?: string;
  docstatus?: 0 | 1 | 2;
}

// ---------------------------------------------------------- Landed Cost Voucher

export type LandedCostReceiptDocType = "Purchase Invoice" | "Purchase Receipt";

/** Standard ERPNext Landed Cost Purchase Receipt (the "Vouchers" child table). */
export interface LandedCostPurchaseReceipt {
  receipt_document_type: LandedCostReceiptDocType;
  receipt_document: string;
  supplier?: string;
  posting_date?: string;
  grand_total?: number;
  idx?: number;
}

/** Standard ERPNext Landed Cost Item (read-only, server-populated from the receipts above). */
export interface LandedCostItem {
  item_code: string;
  description?: string;
  receipt_document_type?: LandedCostReceiptDocType;
  receipt_document?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  applicable_charges?: number;
  purchase_receipt_item?: string;
  cost_center?: string;
  is_fixed_asset?: 0 | 1 | boolean;
  idx?: number;
}

/** Standard ERPNext Landed Cost Taxes and Charges (the charges being allocated). */
export interface LandedCostTaxesAndCharges {
  description: string;
  amount: number;
  expense_account?: string;
  account_currency?: string;
  base_amount?: number;
  idx?: number;
}

/**
 * Standard ERPNext Landed Cost Voucher.
 * Distributes freight/duty/insurance/etc. charges across the items of one or
 * more submitted Purchase Receipts / stock-updating Purchase Invoices, and
 * updates their item valuation rates + GL entries on submit.
 */
export interface LandedCostVoucher {
  name?: string;
  naming_series?: string;
  company: string;
  posting_date: string;
  purchase_receipts: LandedCostPurchaseReceipt[];
  items?: LandedCostItem[];
  taxes: LandedCostTaxesAndCharges[];
  total_taxes_and_charges?: number;
  distribute_charges_based_on: "Qty" | "Amount" | "Distribute Manually";
  docstatus?: 0 | 1 | 2;
  amended_from?: string | null;
}

export type DocTypeName =
  | "Item"
  | "Customer"
  | "Supplier"
  | "Company"
  | "Sales Order"
  | "Purchase Order"
  | "BOM"
  | "Work Order"
  | "Stock Entry"
  | "Purchase Receipt"
  | "Delivery Note"
  | "Sales Invoice"
  | "Purchase Invoice"
  | "LC Proforma"
  | "Export Shipment"
  | "Import Shipment"
  | "Import Cost Sheet"
  | "Export Packing Details"
  | "Landed Cost Voucher"
  | "Payment Entry"
  | "GL Entry";