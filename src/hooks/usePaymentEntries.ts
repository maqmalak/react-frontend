import { useFrappeGetDocList, useFrappeGetCall } from "frappe-react-sdk";
import type { PaymentEntry } from "@/types/frappe";

const PAYMENT_ENTRY_FIELDS = [
  "name",
  "payment_type",
  "posting_date",
  "company",
  "party_type",
  "party",
  "party_name",
  "paid_amount",
  "received_amount",
  "reference_no",
  "reference_date",
  "mode_of_payment",
  "status",
  "docstatus",
] as const;

/**
 * List Payment Entries reconciled against a Purchase Invoice.
 *
 * The link lives on the child table (Payment Entry Reference.reference_name),
 * shared across many reference_doctypes (Sales Invoice, Purchase Invoice,
 * Journal Entry, ...), so `reference_doctype` is passed as an extra exact-match
 * filter to avoid matching a same-named document of a different kind.
 */
export function usePaymentEntriesForPurchaseInvoice(piName?: string) {
  const { data: parentNames, isLoading: namesLoading, error: namesError, mutate: refreshNames } =
    useFrappeGetCall<string[]>(
      "apparel.hooks.get_linked_parent_docs",
      piName
        ? {
            doctype: "Payment Entry Reference",
            parenttype: "Payment Entry",
            link_field: "reference_name",
            link_value: piName,
            // useFrappeGetCall sends this as a GET query param, so an object
            // value must be pre-serialized (axios won't JSON-encode it for us).
            extra_filters: JSON.stringify({ reference_doctype: "Purchase Invoice" }),
          }
        : undefined,
      piName ? `apparel.pe-parents-pi.${piName}` : null,
    );

  const raw = parentNames as unknown;
  const names: string[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { message?: unknown })?.message)
      ? ((raw as { message: string[] }).message)
      : [];

  const { data, isLoading, error, mutate } = useFrappeGetDocList<PaymentEntry>(
    "Payment Entry",
    names.length > 0
      ? {
          fields: PAYMENT_ENTRY_FIELDS as unknown as (keyof PaymentEntry)[],
          filters: [["name", "in", names]],
          limit: 200,
          orderBy: { field: "posting_date", order: "desc" },
        }
      : { filters: [["name", "=", ""]], limit: 0 },
    names.length > 0 ? `apparel.pe-for-pi.${piName}` : undefined,
  );

  return {
    data,
    isLoading: namesLoading || isLoading,
    error: namesError || error,
    mutate: () => {
      void refreshNames();
      void mutate();
    },
  };
}
