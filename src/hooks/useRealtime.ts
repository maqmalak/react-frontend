import { useCallback } from "react";
import { useSWRConfig } from "frappe-react-sdk";

/**
 * Realtime helpers.
 *
 * The FrappeProvider opens a Socket.IO connection. DocType list-event drivers
 * are surfaced by the SDK's `useFrappeDocTypeEventListener` and are wired up in
 * <RealtimeWatcher/> (a component, so hook rules are respected). When any
 * watched DocType changes in ERPNext we globally revalidate SWR so the UI
 * refreshes without a manual page reload.
 */

export const REALTIME_DOCTYPES = [
  "LC Proforma",
  "Export Shipment",
  "Import Shipment",
  "Import Cost Sheet",
  "Export Packing Details",
  "Sales Order",
  "Purchase Order",
  "Purchase Receipt",
  "Purchase Invoice",
  "Landed Cost Voucher",
] as const;

/** Global SWR revalidation handle (used by the watcher and explicit calls). */
export function useRevalidateAll() {
  const { mutate } = useSWRConfig();
  return useCallback(() => {
    void mutate(() => true, undefined, { revalidate: true });
  }, [mutate]);
}

/** Tell the whole UI "data changed" (used after local mutations). */
export const DATA_CHANGED_EVENT = "apparel:data-changed";

export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}

/** Extra server-published events we listen to for revalidation. */
export const APPAREL_SERVER_EVENTS = [
  "apparel_lc_updated",
  "apparel_shipment_updated",
  "apparel_import_updated",
  "apparel_cost_sheet_updated",
  "apparel_production_updated",
] as const;
