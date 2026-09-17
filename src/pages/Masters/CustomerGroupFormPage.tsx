import { useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { MasterFormPage, type MasterFormTab } from "./MasterFormPage";
import { type FormFieldMeta } from "@/components/forms/field-primitives";

const TABS: MasterFormTab[] = [
  {
    id: "details",
    label: "Details",
    fields: [
      { fieldname: "customer_group_name", label: "Customer Group Name", fieldtype: "Data", reqd: true },
      { fieldname: "parent_customer_group", label: "Parent Customer Group", fieldtype: "Link", options: "Customer Group", filters: [["is_group", "=", 1]] },
      { fieldname: "is_group", label: "Is Group (can have child groups)", fieldtype: "Check" },
      { fieldname: "cb_details_1", fieldtype: "Column Break" },
      { fieldname: "default_price_list", label: "Default Price List", fieldtype: "Link", options: "Price List" },
      { fieldname: "payment_terms", label: "Default Payment Terms", fieldtype: "Link", options: "Payment Terms Template" },
    ] as FormFieldMeta[],
  },
];

/** Customer Group — full page, Frappe-style create/edit. */
export function CustomerGroupFormPage() {
  const [searchParams] = useSearchParams();
  return (
    <MasterFormPage
      doctype="Customer Group"
      labelSingular="Customer Group"
      listPath="/masters/customer-groups"
      tabs={TABS}
      primaryField="customer_group_name"
      requiredFields={["customer_group_name"]}
      defaults={{ parent_customer_group: searchParams.get("parent") ?? undefined }}
      icon={<Users className="h-5 w-5" />}
    />
  );
}
