import type { FormFieldMeta } from "@/components/forms/field-primitives";

/**
 * ERPNext-style form definitions for the custom Apparel DocTypes.
 * Field names/options mirror the DocType JSON in the `apparel` Frappe app so
 * create/update payloads round-trip correctly through frappe-react-sdk.
 */

export const LC_PROFORMA_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_identification", label: "Basic Information", fieldtype: "Section Break" },
  { fieldname: "proforma_no", label: "Proforma No.", fieldtype: "Data", read_only: true },
  { fieldname: "proforma_date", label: "Proforma Date", fieldtype: "Date", reqd: true, default: "Today" },
  { fieldname: "column_break_0", fieldtype: "Column Break" },
  { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
  { fieldname: "customer", label: "Customer / Buyer", fieldtype: "Link", options: "Customer", reqd: true },
  { fieldname: "buyer_po_no", label: "Buyer PO", fieldtype: "Data" },
  { fieldname: "export_order", label: "Export Order", fieldtype: "Link", options: "Sales Order", read_only: true },
  { fieldname: "currency", label: "Currency", fieldtype: "Link", options: "Currency", default: "USD" },
  { fieldname: "exchange_rate", label: "Exchange Rate", fieldtype: "Float", precision: 6 },

  { fieldname: "section_break_lc", label: "LC Information", fieldtype: "Section Break" },
  { fieldname: "lc_required", label: "LC Required", fieldtype: "Check", default: 0 },
  { fieldname: "lc_no", label: "LC Number", fieldtype: "Data" },
  { fieldname: "lc_date", label: "LC Date", fieldtype: "Date" },
  { fieldname: "lc_type", label: "LC Type", fieldtype: "Select", options: "\nIrrevocable\nRevocable\nStandby\nConfirmed Irrevocable" },
  { fieldname: "lc_issuing_bank", label: "Issuing Bank", fieldtype: "Data" },
  { fieldname: "lc_advising_bank", label: "Advising Bank", fieldtype: "Data" },
  { fieldname: "lc_confirming_bank", label: "Confirming Bank", fieldtype: "Data" },
  { fieldname: "col_break_lc1", fieldtype: "Column Break" },
  { fieldname: "lc_amount", label: "LC Amount", fieldtype: "Currency" },
  { fieldname: "lc_currency", label: "LC Currency", fieldtype: "Link", options: "Currency", default: "USD" },
  { fieldname: "lc_expiry_date", label: "LC Expiry Date", fieldtype: "Date" },
  { fieldname: "lc_expiry_place", label: "LC Expiry Place", fieldtype: "Data" },
  { fieldname: "latest_shipment_date", label: "Latest Shipment Date", fieldtype: "Date" },
  { fieldname: "partial_shipment_allowed", label: "Partial Shipment Allowed", fieldtype: "Check" },
  { fieldname: "transshipment_allowed", label: "Transshipment Allowed", fieldtype: "Check" },

  { fieldname: "section_break_shipment", label: "Shipment", fieldtype: "Section Break" },
  { fieldname: "port_of_loading", label: "Port of Loading", fieldtype: "Data" },
  { fieldname: "port_of_discharge", label: "Port of Discharge", fieldtype: "Data" },
  { fieldname: "final_destination", label: "Final Destination", fieldtype: "Data" },
  { fieldname: "country_of_destination", label: "Country", fieldtype: "Link", options: "Country" },
  { fieldname: "col_break_ship2", fieldtype: "Column Break" },
  { fieldname: "shipment_mode", label: "Shipment Mode", fieldtype: "Select", options: "\nSea\nAir\nRoad\nRail\nMultimodal" },
  { fieldname: "incoterm", label: "Incoterm", fieldtype: "Select", options: "EXW\nFCA\nFAS\nFOB\nCFR\nCIF\nCPT\nCIP\nDAP\nDPU\nDDP" },
  { fieldname: "payment_terms", label: "Payment Terms", fieldtype: "Link", options: "Payment Terms Template" },

  { fieldname: "section_break_banking", label: "Banking", fieldtype: "Section Break" },
  { fieldname: "beneficiary_bank", label: "Beneficiary Bank", fieldtype: "Data" },
  { fieldname: "bank_account", label: "Bank Account", fieldtype: "Link", options: "Bank Account" },
  { fieldname: "col_break_bank2", fieldtype: "Column Break" },
  { fieldname: "swift_code", label: "SWIFT Code", fieldtype: "Data" },
  { fieldname: "bank_branch", label: "Bank Branch", fieldtype: "Data" },
  { fieldname: "correspondent_bank", label: "Correspondent Bank", fieldtype: "Data" },

  { fieldname: "section_break_totals", label: "Totals", fieldtype: "Section Break" },
  { fieldname: "total_quantity", label: "Total Quantity", fieldtype: "Float", read_only: true },
  { fieldname: "total_cartons", label: "Total Cartons", fieldtype: "Int", read_only: true },
  { fieldname: "col_break_tot2", fieldtype: "Column Break" },
  { fieldname: "total_net_weight", label: "Total Net Weight", fieldtype: "Float", read_only: true },
  { fieldname: "total_gross_weight", label: "Total Gross Weight", fieldtype: "Float", read_only: true },
    { fieldname: "total_proforma_value", label: "Total Proforma Value", fieldtype: "Currency", read_only: true },
];

export const EXPORT_SHIPMENT_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_links", label: "Links", fieldtype: "Section Break" },
  { fieldname: "shipment_no", label: "Shipment No.", fieldtype: "Data", read_only: true },
  { fieldname: "shipment_date", label: "Shipment Date", fieldtype: "Date", default: "Today" },
  { fieldname: "customer", label: "Customer / Buyer", fieldtype: "Link", options: "Customer", reqd: true },
  { fieldname: "sales_order", label: "Sales Order", fieldtype: "Link", options: "Sales Order" },
  { fieldname: "lc_proforma", label: "LC Proforma", fieldtype: "Link", options: "LC Proforma" },
  { fieldname: "lc_no", label: "LC No.", fieldtype: "Data" },
  { fieldname: "commercial_invoice_no", label: "Commercial Invoice No.", fieldtype: "Data" },
  { fieldname: "packing_list_no", label: "Packing List No.", fieldtype: "Data" },
  { fieldname: "col_break_docs", fieldtype: "Column Break" },
  { fieldname: "bill_of_lading_no", label: "Bill of Lading No.", fieldtype: "Data" },
  { fieldname: "container_no", label: "Container No.", fieldtype: "Data" },
  { fieldname: "shipping_line", label: "Shipping Line", fieldtype: "Data" },
  { fieldname: "vessel", label: "Vessel", fieldtype: "Data" },
  { fieldname: "port_of_loading", label: "Port of Loading", fieldtype: "Data" },
  { fieldname: "port_of_discharge", label: "Port of Discharge", fieldtype: "Data" },
  { fieldname: "final_destination", label: "Final Destination", fieldtype: "Data" },
  { fieldname: "col_break_dates", fieldtype: "Column Break" },
  { fieldname: "etd", label: "ETD", fieldtype: "Datetime" },
  { fieldname: "eta", label: "ETA", fieldtype: "Datetime" },
  { fieldname: "actual_shipment_date", label: "Actual Shipment Date", fieldtype: "Date" },
  { fieldname: "shipment_status", label: "Shipment Status", fieldtype: "Select", options: "\nPlanned\nBooking\nStuffing\nShipped\nIn Transit\nArrived\nDelivered\nClosed" },
];
export const IMPORT_SHIPMENT_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_links", label: "Links", fieldtype: "Section Break" },
  { fieldname: "shipment_no", label: "Shipment No.", fieldtype: "Data", read_only: true },
  { fieldname: "shipment_date", label: "Shipment Date", fieldtype: "Date", default: "Today" },
  { fieldname: "supplier", label: "Supplier", fieldtype: "Link", options: "Supplier", reqd: true },
  { fieldname: "purchase_order", label: "Purchase Order", fieldtype: "Link", options: "Purchase Order" },
  { fieldname: "purchase_receipt", label: "Purchase Receipt", fieldtype: "Link", options: "Purchase Receipt" },
  { fieldname: "import_cost_sheet", label: "Import Cost Sheet", fieldtype: "Link", options: "Import Cost Sheet", read_only: true },
  { fieldname: "col_break_docs", fieldtype: "Column Break" },
  { fieldname: "bill_of_lading", label: "Bill of Lading", fieldtype: "Data" },
  { fieldname: "container_no", label: "Container No.", fieldtype: "Data" },
  { fieldname: "shipping_line", label: "Shipping Line", fieldtype: "Data" },
  { fieldname: "vessel", label: "Vessel", fieldtype: "Data" },
  { fieldname: "port_of_loading", label: "Port of Loading", fieldtype: "Data" },
  { fieldname: "port_of_discharge", label: "Port of Discharge", fieldtype: "Data" },
  { fieldname: "col_break_dates", fieldtype: "Column Break" },
  { fieldname: "etd", label: "ETD", fieldtype: "Datetime" },
  { fieldname: "eta", label: "ETA", fieldtype: "Datetime" },
  { fieldname: "actual_arrival", label: "Actual Arrival", fieldtype: "Date" },
  { fieldname: "section_break_clearing", label: "Clearing & Customs", fieldtype: "Section Break" },
  { fieldname: "clearing_agent", label: "Clearing Agent", fieldtype: "Link", options: "Supplier" },
  { fieldname: "customs_declaration_no", label: "Customs Declaration No.", fieldtype: "Data" },
  { fieldname: "col_break_clearing", fieldtype: "Column Break" },
  { fieldname: "duty_amount", label: "Duty Amount", fieldtype: "Currency" },
  { fieldname: "tax_amount", label: "Tax Amount", fieldtype: "Currency" },
  { fieldname: "clearance_date", label: "Clearance Date", fieldtype: "Date" },
  { fieldname: "shipment_status", label: "Shipment Status", fieldtype: "Select", options: "\nPlanned\nBooking\nStuffing\nShipped\nIn Transit\nArrived\nDelivered\nClosed" },
];

export const IMPORT_COST_SHEET_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_links", label: "Links", fieldtype: "Section Break" },
  { fieldname: "cost_sheet_date", label: "Cost Sheet Date", fieldtype: "Date", default: "Today" },
  { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
  { fieldname: "supplier", label: "Supplier", fieldtype: "Link", options: "Supplier", reqd: true },
  { fieldname: "purchase_order", label: "Purchase Order", fieldtype: "Link", options: "Purchase Order" },
  { fieldname: "import_shipment", label: "Import Shipment", fieldtype: "Link", options: "Import Shipment" },
  { fieldname: "purchase_receipt", label: "Purchase Receipt", fieldtype: "Link", options: "Purchase Receipt" },
  { fieldname: "col_break_1", fieldtype: "Column Break" },
  { fieldname: "currency", label: "Currency", fieldtype: "Link", options: "Currency", default: "USD", reqd: true },
  {
    fieldname: "expense_account",
    label: "Expense Account",
    fieldtype: "Link",
    options: "Account",
    description: "Used for each charge when generating a Landed Cost Voucher from this cost sheet. Falls back to Buying Settings › Default Landed Cost Expense Account if left blank.",
  },
  { fieldname: "total_purchase_value", label: "Total Purchase Value", fieldtype: "Currency", read_only: true },
  { fieldname: "total_landed_cost", label: "Total Landed Cost", fieldtype: "Currency", read_only: true },
];
/** Child-table column metadata (for the editable row grids). */
export const LC_PROFORMA_ITEM_COLUMNS: FormFieldMeta[] = [
  { fieldname: "item", label: "Item", fieldtype: "Link", options: "Item", reqd: true },
  { fieldname: "item_name", label: "Item Name", fieldtype: "Data", read_only: true },
  { fieldname: "style_no", label: "Style", fieldtype: "Data" },
  { fieldname: "color", label: "Color", fieldtype: "Data" },
  { fieldname: "size", label: "Size", fieldtype: "Data" },
  { fieldname: "hs_code", label: "HS Code", fieldtype: "Data" },
  { fieldname: "quantity", label: "Qty", fieldtype: "Float", reqd: true },
  { fieldname: "uom", label: "UOM", fieldtype: "Link", options: "UOM" },
  { fieldname: "rate", label: "Rate", fieldtype: "Currency", precision: 4 },
  { fieldname: "amount", label: "Amount", fieldtype: "Currency", read_only: true },
  { fieldname: "cartons", label: "Cartons", fieldtype: "Int" },
  { fieldname: "net_weight", label: "Net Wt.", fieldtype: "Float" },
  { fieldname: "gross_weight", label: "Gross Wt.", fieldtype: "Float" },
];

export const IMPORT_COST_ITEM_COLUMNS: FormFieldMeta[] = [
  { fieldname: "item", label: "Item", fieldtype: "Link", options: "Item", reqd: true },
  { fieldname: "item_name", label: "Item Name", fieldtype: "Data", read_only: true },
  { fieldname: "quantity", label: "Qty", fieldtype: "Float" },
  { fieldname: "uom", label: "UOM", fieldtype: "Link", options: "UOM" },
  { fieldname: "purchase_value", label: "Purchase Value", fieldtype: "Currency" },
  { fieldname: "freight", label: "Freight", fieldtype: "Currency" },
  { fieldname: "insurance", label: "Insurance", fieldtype: "Currency" },
  { fieldname: "customs_duty", label: "Customs Duty", fieldtype: "Currency" },
  { fieldname: "additional_duty", label: "Additional Duty", fieldtype: "Currency" },
  { fieldname: "sales_tax", label: "Sales Tax", fieldtype: "Currency" },
  { fieldname: "regulatory_duty", label: "Regulatory Duty", fieldtype: "Currency" },
  { fieldname: "clearing_charges", label: "Clearing", fieldtype: "Currency" },
  { fieldname: "port_charges", label: "Port Charges", fieldtype: "Currency" },
    { fieldname: "other_charges", label: "Other", fieldtype: "Currency" },
];

// ------------------------------------------------------------- Purchase Order (ERPNext standard)

export const PURCHASE_ORDER_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_basic", label: "Basic Information", fieldtype: "Section Break" },
  {
    fieldname: "naming_series",
    label: "Series",
    fieldtype: "Select",
    options: "PUR-ORD-.YYYY.-",
    reqd: true,
    default: "PUR-ORD-.YYYY.-",
  },
  { fieldname: "supplier", label: "Supplier", fieldtype: "Link", options: "Supplier", reqd: true },
  { fieldname: "supplier_name", label: "Supplier Name", fieldtype: "Data", read_only: true },
  { fieldname: "transaction_date", label: "Date", fieldtype: "Date", reqd: true, default: "Today" },
  { fieldname: "schedule_date", label: "Required By", fieldtype: "Date", reqd: true },
  { fieldname: "column_break_po_0", fieldtype: "Column Break" },
  { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
  { fieldname: "currency", label: "Currency", fieldtype: "Link", options: "Currency", default: "USD", reqd: true },
  { fieldname: "conversion_rate", label: "Exchange Rate", fieldtype: "Float", precision: 6, default: 1, reqd: true },
  { fieldname: "buying_price_list", label: "Price List", fieldtype: "Link", options: "Price List" },

  { fieldname: "section_break_address", label: "Address & Contact", fieldtype: "Section Break" },
  { fieldname: "supplier_address", label: "Supplier Address", fieldtype: "Link", options: "Address" },
  { fieldname: "contact_person", label: "Contact Person", fieldtype: "Link", options: "Contact" },
  { fieldname: "column_break_po_1", fieldtype: "Column Break" },
  { fieldname: "shipping_address", label: "Shipping Address", fieldtype: "Link", options: "Address" },
  { fieldname: "billing_address", label: "Billing Address", fieldtype: "Link", options: "Address" },

  { fieldname: "section_break_terms", label: "Terms", fieldtype: "Section Break" },
  { fieldname: "set_warehouse", label: "Set Target Warehouse", fieldtype: "Link", options: "Warehouse" },
  { fieldname: "incoterm", label: "Incoterm", fieldtype: "Link", options: "Incoterm" },
  { fieldname: "named_place", label: "Named Place", fieldtype: "Data" },
  { fieldname: "column_break_po_2", fieldtype: "Column Break" },
  { fieldname: "payment_terms_template", label: "Payment Terms", fieldtype: "Link", options: "Payment Terms Template" },
  { fieldname: "tc_name", label: "Terms Template", fieldtype: "Link", options: "Terms and Conditions" },
  { fieldname: "terms", label: "Terms and Conditions", fieldtype: "Text Editor" },
];

export const PURCHASE_ORDER_ITEM_COLUMNS: FormFieldMeta[] = [
  { fieldname: "item_code", label: "Item", fieldtype: "Link", options: "Item", reqd: true },
  { fieldname: "item_name", label: "Item Name", fieldtype: "Data", read_only: true },
  { fieldname: "schedule_date", label: "Required By", fieldtype: "Date" },
  { fieldname: "qty", label: "Qty", fieldtype: "Float", reqd: true },
  { fieldname: "uom", label: "UOM", fieldtype: "Link", options: "UOM" },
  { fieldname: "rate", label: "Rate", fieldtype: "Currency", precision: 4 },
  { fieldname: "amount", label: "Amount", fieldtype: "Currency", read_only: true },
  { fieldname: "warehouse", label: "Warehouse", fieldtype: "Link", options: "Warehouse" },
  { fieldname: "description", label: "Description", fieldtype: "Data" },
];

// ------------------------------------------------------------ Purchase Receipt (ERPNext standard)

export const PURCHASE_RECEIPT_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_basic", label: "Basic Information", fieldtype: "Section Break" },
  {
    fieldname: "naming_series",
    label: "Series",
    fieldtype: "Select",
    options: "MAT-PRE-.YYYY.-",
    reqd: true,
    default: "MAT-PRE-.YYYY.-",
  },
  { fieldname: "supplier", label: "Supplier", fieldtype: "Link", options: "Supplier", reqd: true },
  { fieldname: "supplier_name", label: "Supplier Name", fieldtype: "Data", read_only: true },
  { fieldname: "supplier_delivery_note", label: "Supplier Delivery Note", fieldtype: "Data" },
  { fieldname: "posting_date", label: "Date", fieldtype: "Date", reqd: true, default: "Today" },
  { fieldname: "column_break_pr_0", fieldtype: "Column Break" },
  { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
  { fieldname: "currency", label: "Currency", fieldtype: "Link", options: "Currency", default: "USD", reqd: true },
  { fieldname: "conversion_rate", label: "Exchange Rate", fieldtype: "Float", precision: 6, default: 1, reqd: true },
  { fieldname: "buying_price_list", label: "Price List", fieldtype: "Link", options: "Price List" },

  { fieldname: "section_break_pr_warehouse", label: "Warehouse", fieldtype: "Section Break" },
  { fieldname: "set_warehouse", label: "Accepted Warehouse", fieldtype: "Link", options: "Warehouse" },
  { fieldname: "column_break_pr_1", fieldtype: "Column Break" },
  { fieldname: "supplier_warehouse", label: "Supplier Warehouse", fieldtype: "Link", options: "Warehouse" },

  { fieldname: "section_break_pr_terms", label: "Terms", fieldtype: "Section Break" },
  { fieldname: "tc_name", label: "Terms Template", fieldtype: "Link", options: "Terms and Conditions" },
  { fieldname: "column_break_pr_2", fieldtype: "Column Break" },
  { fieldname: "instructions", label: "Instructions", fieldtype: "Text" },
  { fieldname: "terms", label: "Terms and Conditions", fieldtype: "Text Editor" },
];

export const PURCHASE_RECEIPT_ITEM_COLUMNS: FormFieldMeta[] = [
  { fieldname: "item_code", label: "Item", fieldtype: "Link", options: "Item", reqd: true },
  { fieldname: "item_name", label: "Item Name", fieldtype: "Data", read_only: true },
  { fieldname: "purchase_order", label: "Purchase Order", fieldtype: "Link", options: "Purchase Order" },
  { fieldname: "received_qty", label: "Received Qty", fieldtype: "Float" },
  { fieldname: "qty", label: "Accepted Qty", fieldtype: "Float", reqd: true },
  { fieldname: "rejected_qty", label: "Rejected Qty", fieldtype: "Float" },
  { fieldname: "uom", label: "UOM", fieldtype: "Link", options: "UOM" },
  { fieldname: "rate", label: "Rate", fieldtype: "Currency", precision: 4 },
  { fieldname: "amount", label: "Amount", fieldtype: "Currency", read_only: true },
  { fieldname: "warehouse", label: "Accepted Warehouse", fieldtype: "Link", options: "Warehouse" },
  { fieldname: "rejected_warehouse", label: "Rejected Warehouse", fieldtype: "Link", options: "Warehouse" },
  { fieldname: "quality_inspection", label: "Quality Inspection", fieldtype: "Link", options: "Quality Inspection" },
];

// ------------------------------------------------------------ Purchase Invoice (ERPNext standard)

export const PURCHASE_INVOICE_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_basic", label: "Basic Information", fieldtype: "Section Break" },
  {
    fieldname: "naming_series",
    label: "Series",
    fieldtype: "Select",
    options: "ACC-PINV-.YYYY.-",
    reqd: true,
    default: "ACC-PINV-.YYYY.-",
  },
  { fieldname: "supplier", label: "Supplier", fieldtype: "Link", options: "Supplier", reqd: true },
  { fieldname: "supplier_name", label: "Supplier Name", fieldtype: "Data", read_only: true },
  { fieldname: "bill_no", label: "Supplier Invoice No", fieldtype: "Data" },
  { fieldname: "bill_date", label: "Supplier Invoice Date", fieldtype: "Date" },
  { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", reqd: true, default: "Today" },
  { fieldname: "due_date", label: "Due Date", fieldtype: "Date" },
  { fieldname: "column_break_pi_0", fieldtype: "Column Break" },
  { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
  { fieldname: "currency", label: "Currency", fieldtype: "Link", options: "Currency", default: "USD" },
  { fieldname: "conversion_rate", label: "Exchange Rate", fieldtype: "Float", precision: 6, default: 1 },
  { fieldname: "buying_price_list", label: "Price List", fieldtype: "Link", options: "Price List" },
  { fieldname: "update_stock", label: "Update Stock", fieldtype: "Check", default: 0, description: "Receive stock directly through this invoice (no separate Purchase Receipt)." },

  { fieldname: "section_break_pi_warehouse", label: "Warehouse (used only when Update Stock is checked)", fieldtype: "Section Break" },
  { fieldname: "set_warehouse", label: "Accepted Warehouse", fieldtype: "Link", options: "Warehouse" },
  { fieldname: "column_break_pi_1", fieldtype: "Column Break" },
  { fieldname: "rejected_warehouse", label: "Rejected Warehouse", fieldtype: "Link", options: "Warehouse" },

  { fieldname: "section_break_pi_terms", label: "Terms", fieldtype: "Section Break" },
  { fieldname: "payment_terms_template", label: "Payment Terms", fieldtype: "Link", options: "Payment Terms Template" },
  { fieldname: "tc_name", label: "Terms Template", fieldtype: "Link", options: "Terms and Conditions" },
  { fieldname: "column_break_pi_2", fieldtype: "Column Break" },
  { fieldname: "terms", label: "Terms and Conditions", fieldtype: "Text Editor" },
];

export const PURCHASE_INVOICE_ITEM_COLUMNS: FormFieldMeta[] = [
  { fieldname: "item_code", label: "Item", fieldtype: "Link", options: "Item", reqd: true },
  { fieldname: "item_name", label: "Item Name", fieldtype: "Data", read_only: true },
  { fieldname: "purchase_order", label: "Purchase Order", fieldtype: "Link", options: "Purchase Order" },
  { fieldname: "purchase_receipt", label: "Purchase Receipt", fieldtype: "Link", options: "Purchase Receipt" },
  { fieldname: "qty", label: "Qty", fieldtype: "Float", reqd: true },
  { fieldname: "uom", label: "UOM", fieldtype: "Link", options: "UOM" },
  { fieldname: "rate", label: "Rate", fieldtype: "Currency", precision: 4 },
  { fieldname: "amount", label: "Amount", fieldtype: "Currency", read_only: true },
  { fieldname: "warehouse", label: "Accepted Warehouse", fieldtype: "Link", options: "Warehouse" },
  { fieldname: "expense_account", label: "Expense Account", fieldtype: "Link", options: "Account" },
];

// ------------------------------------------------------------ Landed Cost Voucher (ERPNext standard)

export const LANDED_COST_VOUCHER_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_lcv_basic", label: "Basic Information", fieldtype: "Section Break" },
  {
    fieldname: "naming_series",
    label: "Series",
    fieldtype: "Select",
    options: "MAT-LCV-.YYYY.-",
    reqd: true,
    default: "MAT-LCV-.YYYY.-",
  },
  { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
  { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", reqd: true, default: "Today" },
  { fieldname: "column_break_lcv_0", fieldtype: "Column Break" },
  {
    fieldname: "distribute_charges_based_on",
    label: "Distribute Charges Based On",
    fieldtype: "Select",
    options: "Qty\nAmount\nDistribute Manually",
    reqd: true,
    default: "Qty",
  },
  { fieldname: "total_taxes_and_charges", label: "Total Landed Cost", fieldtype: "Currency", read_only: true },
];

/** "Vouchers" table — which submitted Purchase Receipt(s)/Invoice(s) this LCV applies to. */
export const LANDED_COST_RECEIPT_COLUMNS: FormFieldMeta[] = [
  {
    fieldname: "receipt_document_type",
    label: "Type",
    fieldtype: "Select",
    options: "Purchase Receipt\nPurchase Invoice",
    reqd: true,
  },
  { fieldname: "receipt_document", label: "Document", fieldtype: "Dynamic Link", options: "receipt_document_type", reqd: true },
  { fieldname: "supplier", label: "Supplier", fieldtype: "Data", read_only: true },
  { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", read_only: true },
  { fieldname: "grand_total", label: "Grand Total", fieldtype: "Currency", read_only: true },
];

/** "Receipt Items" table — read-only, populated server-side from the vouchers above. */
export const LANDED_COST_ITEM_COLUMNS: FormFieldMeta[] = [
  { fieldname: "item_code", label: "Item", fieldtype: "Data", read_only: true },
  { fieldname: "receipt_document", label: "From", fieldtype: "Data", read_only: true },
  { fieldname: "qty", label: "Qty", fieldtype: "Float", read_only: true },
  { fieldname: "rate", label: "Rate", fieldtype: "Currency", read_only: true },
  { fieldname: "amount", label: "Amount", fieldtype: "Currency", read_only: true },
  { fieldname: "applicable_charges", label: "Applicable Charges", fieldtype: "Currency", read_only: true },
  { fieldname: "cost_center", label: "Cost Center", fieldtype: "Data", read_only: true },
];

/** "Landed Cost" taxes table — the charges (freight, duty, insurance, ...) being allocated. */
export const LANDED_COST_TAXES_COLUMNS: FormFieldMeta[] = [
  { fieldname: "description", label: "Description", fieldtype: "Data", reqd: true },
  { fieldname: "expense_account", label: "Expense Account", fieldtype: "Link", options: "Account", reqd: true },
  { fieldname: "amount", label: "Amount", fieldtype: "Currency", reqd: true },
];

// ------------------------------------------------------------------ Journal Entry

export const JOURNAL_ENTRY_FIELDS: FormFieldMeta[] = [
  { fieldname: "section_break_je_basic", label: "Basic Information", fieldtype: "Section Break" },
  {
    fieldname: "voucher_type",
    label: "Entry Type",
    fieldtype: "Select",
    options:
      "Journal Entry\nBank Entry\nCash Entry\nCredit Card Entry\nDebit Note\nCredit Note\nContra Entry\nExcise Entry\nWrite Off Entry\nOpening Entry\nDepreciation Entry\nExchange Rate Revaluation\nDeferred Revenue\nDeferred Expense",
    reqd: true,
    default: "Journal Entry",
  },
  { fieldname: "company", label: "Company", fieldtype: "Link", options: "Company", reqd: true },
  { fieldname: "posting_date", label: "Posting Date", fieldtype: "Date", reqd: true, default: "Today" },
  { fieldname: "column_break_je_0", fieldtype: "Column Break" },
  { fieldname: "total_debit", label: "Total Debit", fieldtype: "Currency", read_only: true },
  { fieldname: "total_credit", label: "Total Credit", fieldtype: "Currency", read_only: true },
  { fieldname: "section_break_je_remark", label: "Reference", fieldtype: "Section Break" },
  { fieldname: "user_remark", label: "Remark", fieldtype: "Text" },
];

/** "Accounting Entries" table — the actual debit/credit lines. Must balance to save. */
export const JOURNAL_ENTRY_ACCOUNT_COLUMNS: FormFieldMeta[] = [
  { fieldname: "account", label: "Account", fieldtype: "Link", options: "Account", reqd: true },
  {
    fieldname: "party_type",
    label: "Party Type",
    fieldtype: "Select",
    options: "\nCustomer\nSupplier\nEmployee\nShareholder",
  },
  { fieldname: "party", label: "Party", fieldtype: "Dynamic Link", options: "party_type" },
  { fieldname: "cost_center", label: "Cost Center", fieldtype: "Link", options: "Cost Center" },
  { fieldname: "debit_in_account_currency", label: "Debit", fieldtype: "Currency" },
  { fieldname: "credit_in_account_currency", label: "Credit", fieldtype: "Currency" },
];
