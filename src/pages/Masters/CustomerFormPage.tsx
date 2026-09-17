import { Users } from "lucide-react";
import { MasterFormPage, type MasterFormTab } from "./MasterFormPage";
import { type FormFieldMeta } from "@/components/forms/field-primitives";

const TABS: MasterFormTab[] = [
  {
    id: "details",
    label: "Details",
    fields: [
      { fieldname: "customer_name", label: "Customer Name", fieldtype: "Data", reqd: true },
      { fieldname: "customer_type", label: "Customer Type", fieldtype: "Select", options: "Company\nIndividual\nPartnership", reqd: true },
      { fieldname: "customer_group", label: "Customer Group", fieldtype: "Link", options: "Customer Group" },
      { fieldname: "cb_details_1", fieldtype: "Column Break" },
      { fieldname: "territory", label: "Territory", fieldtype: "Link", options: "Territory" },
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
      { fieldname: "industry", label: "Industry", fieldtype: "Link", options: "Industry Type" },
      { fieldname: "market_segment", label: "Market Segment", fieldtype: "Link", options: "Market Segment" },
      { fieldname: "cb_more_1", fieldtype: "Column Break" },
      { fieldname: "default_sales_partner", label: "Default Sales Partner", fieldtype: "Link", options: "Sales Partner" },
      { fieldname: "default_commission_rate", label: "Default Commission Rate (%)", fieldtype: "Float" },
      { fieldname: "so_required", label: "Sales Order Required Before Sales Invoice", fieldtype: "Check" },
      { fieldname: "dn_required", label: "Delivery Note Required Before Sales Invoice", fieldtype: "Check" },
    ] as FormFieldMeta[],
  },
];

/** Customer — full page, Frappe-style tabbed create/edit. */
export function CustomerFormPage() {
  return (
    <MasterFormPage
      doctype="Customer"
      labelSingular="Customer"
      listPath="/masters/customers"
      tabs={TABS}
      primaryField="customer_name"
      requiredFields={["customer_name", "customer_type"]}
      defaults={{ customer_type: "Company" }}
      icon={<Users className="h-5 w-5" />}
    />
  );
}
