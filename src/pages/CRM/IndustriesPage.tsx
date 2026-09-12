import { MastersPage } from "@/components/crm/MastersPage";
import { Factory } from "lucide-react";

/** Master data for `CRM Industry` (crm/fcrm/doctype/crm_industry). */
export default function IndustriesPage() {
  return (
    <MastersPage
      config={{
        title: "Industries",
        subtitle: "Industry verticals available on Leads and Organizations",
        icon: <Factory className="h-5 w-5" />,
        doctype: "CRM Industry",
        fields: ["name", "industry"],
        formFields: [{ fieldname: "industry", label: "Industry", fieldtype: "Data" }],
        primaryField: "industry",
        primaryLabel: "Industry",
      }}
    />
  );
}
