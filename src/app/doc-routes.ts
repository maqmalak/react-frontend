/**
 * Where each DocType's record opens in the React app: `${base}${name}`.
 * Anything not listed opens in the ERPNext desk (`/app/<doctype-slug>/<name>`, proxied in dev).
 */
export const DOC_ROUTES: Record<string, string> = {
  // Buying / import
  "Material Request": "/import/material-requests/",
  "Request for Quotation": "/import/rfqs/",
  "Purchase Order": "/import/purchase-orders/",
  "Import Shipment": "/import/shipments/",
  "Import Cost Sheet": "/import/cost-sheets/",
  "Purchase Receipt": "/purchase/receipts/",
  "Purchase Invoice": "/purchase/invoices/",
  "Landed Cost Voucher": "/purchase/landed-costs/",
  // Selling / export
  "Sales Order": "/selling/sales-orders/",
  Quotation: "/selling/quotations/",
  "Blanket Order": "/selling/blanket-orders/",
  "Pricing Rule": "/selling/pricing-rules/",
  "Product Bundle": "/selling/product-bundles/",
  "Price List": "/selling/price-lists/",
  "Sales Taxes and Charges Template": "/selling/tax-templates/",
  "Sales Partner": "/selling/sales-partners/",
  "Sales Person": "/selling/sales-persons/",
  Territory: "/selling/territories/",
  "Delivery Note": "/selling/delivery-notes/",
  "Sales Invoice": "/selling/sales-invoices/",
  "LC Proforma": "/export/lc-proforma/",
  "Export Shipment": "/export/shipments/",
  "Export Packing Details": "/export/packing/",
  // Stock
  "Stock Entry": "/inventory/stock-entries/",
  Warehouse: "/inventory/warehouses/",
  "Stock Reconciliation": "/inventory/reconciliations/",
  "Item Price": "/inventory/item-prices/",
  Batch: "/inventory/batches/",
  "Serial No": "/inventory/serial-nos/",
  "Pick List": "/inventory/pick-lists/",
  // Masters
  Item: "/masters/items/",
  "Item Group": "/masters/item-groups/",
  Customer: "/masters/customers/",
  "Customer Group": "/masters/customer-groups/",
  Supplier: "/masters/suppliers/",
  "Supplier Group": "/masters/supplier-groups/",
  // Accounting
  "Journal Entry": "/accounting/journal-entries/",
  "Payment Entry": "/accounting/payment-entries/",
  // Production
  BOM: "/production/boms/",
  "Work Order": "/production/work-orders/",
  "Production Plan": "/production/production-plans/",
  "Job Card": "/production/job-cards/",
  "Downtime Entry": "/production/downtime/",
  Workstation: "/production/workstations/",
  "Workstation Type": "/production/workstation-types/",
  Routing: "/production/routings/",
  Operation: "/production/operations/",
  "Item Alternative": "/production/item-alternatives/",
  // Subcontracting
  "Subcontracting Order": "/subcontracting/orders/",
  "Subcontracting Receipt": "/subcontracting/receipts/",
  "Subcontracting BOM": "/subcontracting/boms/",
  // Quality
  "Quality Inspection": "/quality/inspections/",
  "Quality Inspection Template": "/quality/templates/",
  "Quality Procedure": "/quality/procedures/",
  "Quality Goal": "/quality/goals/",
  "Quality Review": "/quality/reviews/",
  "Non Conformance": "/quality/non-conformances/",
  "Quality Action": "/quality/actions/",
  // Assets / projects
  Asset: "/asset-management/register/",
  "Asset Category": "/asset-management/categories/",
  "Asset Movement": "/asset-management/movements/",
  "Asset Repair": "/asset-management/repairs/",
  Location: "/asset-management/locations/",
  Project: "/projects/list/",
  Task: "/projects/tasks/",
  // Support / POS / approvals
  Issue: "/support/issues/",
  "Issue Type": "/support/issue-types/",
  "Service Level Agreement": "/support/slas/",
  "POS Invoice": "/pos/invoices/",
  "POS Profile": "/pos/profiles/",
  "POS Opening Entry": "/pos/openings/",
  "POS Closing Entry": "/pos/closings/",
  Workflow: "/approvals/workflows/",
  Notification: "/approvals/notifications/",
  "Assignment Rule": "/approvals/assignment-rules/",
  "Auto Repeat": "/approvals/auto-repeats/",
  // People / CRM / admin
  Employee: "/hr/employees/",
  "Salary Slip": "/payroll/salary-slips/",
  "CRM Lead": "/crm/leads/",
  "CRM Deal": "/crm/deals/",
  User: "/admin/users/",
  Role: "/admin/roles/",
};

const slug = (doctype: string) => doctype.toLowerCase().replace(/ /g, "-");

/** React route for a record, or the desk URL (external) when the app has no screen for it. */
export function docUrl(doctype: string, name: string): { href: string; external: boolean } {
  const base = DOC_ROUTES[doctype];
  return base ? { href: `${base}${encodeURIComponent(name)}`, external: false } : { href: deskUrl(doctype, name), external: true };
}

export const deskUrl = (doctype: string, name?: string) => `/app/${slug(doctype)}${name ? `/${encodeURIComponent(name)}` : ""}`;
export const printUrl = (doctype: string, name: string, format?: string) =>
  `/printview?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(name)}&trigger_print=1${format ? `&format=${encodeURIComponent(format)}` : ""}`;
