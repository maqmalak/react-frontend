import { useSearchParams } from "react-router-dom";
import { Boxes } from "lucide-react";
import { MasterFormPage, type MasterFormTab } from "./MasterFormPage";
import { type FormFieldMeta } from "@/components/forms/field-primitives";

const TABS: MasterFormTab[] = [
  {
    id: "details",
    label: "Details",
    fields: [
      { fieldname: "item_group_name", label: "Item Group Name", fieldtype: "Data", reqd: true },
      { fieldname: "parent_item_group", label: "Parent Item Group", fieldtype: "Link", options: "Item Group", filters: [["is_group", "=", 1]] },
      { fieldname: "is_group", label: "Is Group (can have child groups)", fieldtype: "Check" },
    ] as FormFieldMeta[],
  },
];

/** Item Group — full page, Frappe-style create/edit. */
export function ItemGroupFormPage() {
  const [searchParams] = useSearchParams();
  return (
    <MasterFormPage
      doctype="Item Group"
      labelSingular="Item Group"
      listPath="/masters/item-groups"
      tabs={TABS}
      primaryField="item_group_name"
      requiredFields={["item_group_name"]}
      defaults={{ parent_item_group: searchParams.get("parent") ?? undefined }}
      icon={<Boxes className="h-5 w-5" />}
    />
  );
}
