import { useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { MasterFormPage, type MasterFormTab } from "./MasterFormPage";
import { type FormFieldMeta } from "@/components/forms/field-primitives";

const TABS: MasterFormTab[] = [
  {
    id: "details",
    label: "Details",
    fields: [
      { fieldname: "supplier_group_name", label: "Supplier Group Name", fieldtype: "Data", reqd: true },
      { fieldname: "parent_supplier_group", label: "Parent Supplier Group", fieldtype: "Link", options: "Supplier Group", filters: [["is_group", "=", 1]] },
      { fieldname: "is_group", label: "Is Group (can have child groups)", fieldtype: "Check" },
      { fieldname: "cb_details_1", fieldtype: "Column Break" },
      { fieldname: "payment_terms", label: "Default Payment Terms", fieldtype: "Link", options: "Payment Terms Template" },
    ] as FormFieldMeta[],
  },
];

/** Supplier Group — full page, Frappe-style create/edit. */
export function SupplierGroupFormPage() {
  const [searchParams] = useSearchParams();
  return (
    <MasterFormPage
      doctype="Supplier Group"
      labelSingular="Supplier Group"
      listPath="/masters/supplier-groups"
      tabs={TABS}
      primaryField="supplier_group_name"
      requiredFields={["supplier_group_name"]}
      defaults={{ parent_supplier_group: searchParams.get("parent") ?? undefined }}
      icon={<Users className="h-5 w-5" />}
    />
  );
}
