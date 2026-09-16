import { useFrappeGetDocList } from "frappe-react-sdk";
import type { Customer } from "@/types/frappe";

const CUSTOMER_FIELDS = ["name", "customer_name", "territory", "customer_group", "disabled"] as const;

/** List customers (buyers). */
export function useCustomers(args?: { enabled?: boolean; limit?: number; search?: string }) {
  const { enabled = true, limit = 500, search } = args ?? {};
  const filters: unknown[][] = [["disabled", "=", 0]];
  const orFilters: unknown[][] | undefined = search?.trim()
    ? [
        ["name", "like", `%${search.trim()}%`],
        ["customer_name", "like", `%${search.trim()}%`],
      ]
    : undefined;

  return useFrappeGetDocList<Customer>(
    "Customer",
    {
      fields: CUSTOMER_FIELDS as unknown as (keyof Customer)[],
      limit,
      orderBy: { field: "customer_name", order: "asc" },
      filters: filters as any,
      ...(orFilters ? { orFilters: orFilters as any } : {}),
    },
    enabled ? `micromax.customers.${search?.trim() || "all"}.${limit}` : null,
  );
}

export function useCustomerOptions(enabled = true) {
  const { data, error, isLoading } = useCustomers({ enabled, limit: 500 });
  return {
    options: (data ?? [])
      .filter((c) => c.name)
      .map((c) => ({
        value: c.name as string,
        label:
          c.customer_name && c.customer_name !== c.name
            ? `${c.customer_name} (${c.name})`
            : ((c.customer_name ?? c.name) as string),
      })),
    data,
    error,
    isLoading,
  };
}
