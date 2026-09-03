import { useFrappeGetDocList } from "frappe-react-sdk";
import type { Supplier } from "@/types/frappe";

const SUPPLIER_FIELDS = ["name", "supplier_name", "supplier_group", "country", "disabled"] as const;

/** List suppliers. */
export function useSuppliers(args?: { enabled?: boolean; limit?: number }) {
  const { enabled = true, limit = 400 } = args ?? {};
  return useFrappeGetDocList<Supplier>(
    "Supplier",
    {
      fields: SUPPLIER_FIELDS as unknown as (keyof Supplier)[],
      limit,
      orderBy: { field: "supplier_name", order: "asc" },
      filters: [["disabled", "=", 0]] as unknown as [],
    },
    enabled ? "apparel.suppliers" : null,
  );
}

export function useSupplierOptions(enabled = true) {
  const { data, error, isLoading } = useSuppliers({ enabled });
  return {
    options: (data ?? []).map((s) => ({ value: s.name, label: s.supplier_name ?? s.name })),
    data,
    error,
    isLoading,
  };
}