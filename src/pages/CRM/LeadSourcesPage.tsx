import { MastersPage } from "@/components/crm/MastersPage";
import { Megaphone } from "lucide-react";

/** Master data for `CRM Lead Source` (crm/fcrm/doctype/crm_lead_source). */
export default function LeadSourcesPage() {
  return (
    <MastersPage
      config={{
        title: "Lead Sources",
        subtitle: "Channels that generate leads — used by the Source field on Leads and Deals",
        icon: <Megaphone className="h-5 w-5" />,
        doctype: "CRM Lead Source",
        fields: ["name", "source_name", "details"],
        formFields: [
          { fieldname: "source_name", label: "Source Name", fieldtype: "Data", reqd: true },
          { fieldname: "details", label: "Details", fieldtype: "Text Editor" },
        ],
        primaryField: "source_name",
        primaryLabel: "Source Name",
        secondaryFields: [{ field: "details", label: "Details" }],
      }}
    />
  );
}
