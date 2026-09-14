import { GitBranch } from "lucide-react";
import { MastersPage } from "@/components/crm/MastersPage";

interface BranchRow {
  name: string;
  branch?: string;
}

export default function BranchesPage() {
  return (
    <MastersPage<BranchRow>
      config={{
        title: "Branches",
        subtitle: "Company branches / office locations",
        icon: <GitBranch className="h-5 w-5" />,
        doctype: "Branch",
        fields: ["name", "branch"],
        formFields: [{ fieldname: "branch", label: "Branch", fieldtype: "Data", reqd: true }],
        primaryField: "branch",
        primaryLabel: "Branch",
      }}
    />
  );
}
