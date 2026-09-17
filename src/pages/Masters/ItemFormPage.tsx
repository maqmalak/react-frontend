import { Boxes } from "lucide-react";
import { MasterFormPage, type MasterFormTab } from "./MasterFormPage";
import { type FormFieldMeta } from "@/components/forms/field-primitives";

const TABS: MasterFormTab[] = [
  {
    id: "details",
    label: "Details",
    fields: [
      { fieldname: "item_code", label: "Item Code", fieldtype: "Data", reqd: true, description: "Fixed once created." },
      { fieldname: "item_name", label: "Item Name", fieldtype: "Data" },
      { fieldname: "item_group", label: "Item Group", fieldtype: "Link", options: "Item Group", reqd: true },
      { fieldname: "stock_uom", label: "Default Unit of Measure", fieldtype: "Link", options: "UOM", reqd: true },
      { fieldname: "cb_details_1", fieldtype: "Column Break" },
      { fieldname: "brand", label: "Brand", fieldtype: "Link", options: "Brand" },
      { fieldname: "is_stock_item", label: "Maintain Stock", fieldtype: "Check" },
      { fieldname: "has_variants", label: "Has Variants", fieldtype: "Check" },
      { fieldname: "disabled", label: "Disabled", fieldtype: "Check" },
      { fieldname: "sb_description", label: "Description", fieldtype: "Section Break" },
      { fieldname: "description", label: "Description", fieldtype: "Text Editor" },
    ] as FormFieldMeta[],
  },
  {
    id: "inventory",
    label: "Inventory",
    fields: [
      { fieldname: "valuation_method", label: "Valuation Method", fieldtype: "Select", options: "\nFIFO\nMoving Average\nLIFO" },
      { fieldname: "weight_per_unit", label: "Weight Per Unit", fieldtype: "Float" },
      { fieldname: "weight_uom", label: "Weight UOM", fieldtype: "Link", options: "UOM" },
      { fieldname: "cb_inv_1", fieldtype: "Column Break" },
      { fieldname: "shelf_life_in_days", label: "Shelf Life (days)", fieldtype: "Int" },
      { fieldname: "has_batch_no", label: "Has Batch No", fieldtype: "Check" },
      { fieldname: "has_serial_no", label: "Has Serial No", fieldtype: "Check" },
    ] as FormFieldMeta[],
  },
  {
    id: "purchasing",
    label: "Purchasing",
    fields: [
      { fieldname: "is_purchase_item", label: "Allow Purchase", fieldtype: "Check" },
      { fieldname: "purchase_uom", label: "Purchase UOM", fieldtype: "Link", options: "UOM" },
      { fieldname: "lead_time_days", label: "Lead Time (days)", fieldtype: "Int" },
      { fieldname: "cb_purchasing_1", fieldtype: "Column Break" },
      { fieldname: "min_order_qty", label: "Minimum Order Qty", fieldtype: "Float" },
      { fieldname: "safety_stock", label: "Safety Stock", fieldtype: "Float" },
    ] as FormFieldMeta[],
  },
  {
    id: "sales",
    label: "Sales",
    fields: [
      { fieldname: "is_sales_item", label: "Allow Sales", fieldtype: "Check" },
      { fieldname: "sales_uom", label: "Sales UOM", fieldtype: "Link", options: "UOM" },
      { fieldname: "cb_sales_1", fieldtype: "Column Break" },
      { fieldname: "standard_rate", label: "Standard Selling Rate", fieldtype: "Currency" },
      { fieldname: "max_discount", label: "Max Discount (%)", fieldtype: "Float" },
    ] as FormFieldMeta[],
  },
];

/** Item — full page, Frappe-style tabbed create/edit. */
export function ItemFormPage() {
  return (
    <MasterFormPage
      doctype="Item"
      labelSingular="Item"
      listPath="/masters/items"
      tabs={TABS}
      primaryField="item_name"
      requiredFields={["item_code", "item_group", "stock_uom"]}
      defaults={{ is_stock_item: 1, is_purchase_item: 1, is_sales_item: 1 }}
      icon={<Boxes className="h-5 w-5" />}
    />
  );
}
