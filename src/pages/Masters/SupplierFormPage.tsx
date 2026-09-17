import { Users } from "lucide-react";
import { MasterFormPage, type MasterFormTab } from "./MasterFormPage";
import { type FormFieldMeta } from "@/components/forms/field-primitives";

const TABS: MasterFormTab[] = [
  {
    id: "details",
    label: "Details",
    fields: [
      { fieldname: "supplier_name", label: "Supplier Name", fieldtype: "Data", reqd: true },
      { fieldname: "supplier_type", label: "Supplier Type", fieldtype: "Select", options: "Company\nIndividual\nPartnership", reqd: true },
      { fieldname: "supplier_group", label: "Supplier Group", fieldtype: "Link", options: "Supplier Group" },
      { fieldname: "cb_details_1", fieldtype: "Column Break" },
      { fieldname: "country", label: "Country", fieldtype: "Link", options: "Country" },
      { fieldname: "tax_id", label: "Tax ID", fieldtype: "Data" },
      { fieldname: "disabled", label: "Disabled", fieldtype: "Check" },
    ] as FormFieldMeta[],
  },
  {
    id: "accounting",
    label: "Accounting",
    fields: [
      { fieldname: "default_currency", label: "Default Currency", fieldtype: "Link", options: "Currency" },
      { fieldname: "default_price_list", label: "Default Price List", fieldtype: "Link", options: "Price List" },
      { fieldname: "payment_terms", label: "Default Payment Terms", fieldtype: "Link", options: "Payment Terms Template" },
      { fieldname: "cb_acc_1", fieldtype: "Column Break" },
      { fieldname: "tax_category", label: "Tax Category", fieldtype: "Link", options: "Tax Category" },
      { fieldname: "is_frozen", label: "Frozen (transactions blocked)", fieldtype: "Check" },
    ] as FormFieldMeta[],
  },
  {
    id: "more-info",
    label: "More Info",
    fields: [
      { fieldname: "language", label: "Print Language", fieldtype: "Link", options: "Language" },
      { fieldname: "website", label: "Website", fieldtype: "Data" },
      { fieldname: "is_transporter", label: "Is Transporter", fieldtype: "Check" },
      { fieldname: "cb_more_1", fieldtype: "Column Break" },
      { fieldname: "on_hold", label: "On Hold", fieldtype: "Check" },
      { fieldname: "hold_type", label: "Hold Type", fieldtype: "Select", options: "\nAll\nInvoices\nPayments" },
      { fieldname: "sb_rfq", label: "Warnings", fieldtype: "Section Break" },
      { fieldname: "warn_rfqs", label: "Warn for New RFQs", fieldtype: "Check" },
      { fieldname: "warn_pos", label: "Warn for New Purchase Orders", fieldtype: "Check" },
      { fieldname: "cb_warn_1", fieldtype: "Column Break" },
      { fieldname: "prevent_rfqs", label: "Prevent New RFQs", fieldtype: "Check" },
      { fieldname: "prevent_pos", label: "Prevent New Purchase Orders", fieldtype: "Check" },
    ] as FormFieldMeta[],
  },
];

/** Supplier — full page, Frappe-style tabbed create/edit. */
export function SupplierFormPage() {
  return (
    <MasterFormPage
      doctype="Supplier"
      labelSingular="Supplier"
      listPath="/masters/suppliers"
      tabs={TABS}
      primaryField="supplier_name"
      requiredFields={["supplier_name", "supplier_type"]}
      defaults={{ supplier_type: "Company" }}
      icon={<Users className="h-5 w-5" />}
    />
  );
}
