import { useFrappeGetDocList, useFrappeGetDoc } from "frappe-react-sdk";
import type { Company } from "@/types/frappe";

/** List of companies. */
export function useCompanies(enabled = true) {
  return useFrappeGetDocList<Company>(
    "Company",
    { fields: ["name", "company_name", "default_currency", "abbr"], orderBy: { field: "name", order: "asc" } },
    enabled ? "apparel.companies" : null,
  );
}

export function useCompany(name?: string) {
  return useFrappeGetDoc<Company>("Company", name ?? undefined, name ? `apparel.company.${name}` : null);
}

/** Companies available to the current user (respects ERPNext per-user permissions). */
export function useCompanyOptions(enabled = true) {
  const { data, error, isLoading } = useCompanies(enabled);
  return {
    options: (data ?? []).map((c) => ({ value: c.name, label: c.company_name ?? c.name })),
    data,
    error,
    isLoading,
  };
}