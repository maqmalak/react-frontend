import { callDocMethod, getCall, postCall, postCallForDoc } from "./frappe";
import type {
  FrappeUser,
  LandedCostReceiptDocType,
  LandedCostVoucher,
  PurchaseInvoice,
  PurchaseReceipt,
  SalesOrder,
} from "@/types/frappe";

/**
 * Apparel business-logic API layer.
 *
 * These wrap ERPNext whitelisted methods. Any authorization / accounting logic
 * lives server-side in the `apparel` Frappe app; this frontend only calls it.
 */

/** Fetch the current user (with roles) — used by the header. */
export async function fetchCurrentUser(): Promise<FrappeUser> {
  const user = await getCall<FrappeUser>("frappe.auth.get_logged_user");
  return user;
}

export async function fetchUserRoles(user: string): Promise<string[]> {
  const result = await postCall<{ roles: string[] }>("frappe.auth.get_roles", { user });
  return result?.roles ?? [];
}

/** Helper to build a "select" payload for sales order list queries. */
export interface SalesOrderQuery {
  filters?: unknown[][];
  fields?: string[];
  limit_start?: number;
  limit?: number;
  orderBy?: string;
}

export async function listSalesOrders(query: SalesOrderQuery): Promise<SalesOrder[]> {
  return getCall("frappe.client.get_list", {
    doctype: "Sales Order",
    filters: query.filters ?? [],
    fields: query.fields ?? ["*"],
    limit_start: query.limit_start ?? 0,
    limit: query.limit ?? 100,
    order_by: query.orderBy ?? "modified desc",
  });
}

/** Fetch a Frappe document (used when a doc-method needs the raw record). */
export async function getDocument<T>(doctype: string, name: string): Promise<T> {
  return getCall("frappe.client.get", { doctype, name });
}

/**
 * Mapped-doc creation helpers (ERPNext's "Get Items From" / desk "Create"
 * buttons). Each returns a fully populated but *unsaved* document — the
 * caller is expected to route to the relevant form page and let the user
 * review/edit before saving.
 */

/** Build an unsaved Purchase Receipt from a submitted Purchase Order. */
export function makePurchaseReceiptFromPO(poName: string): Promise<PurchaseReceipt> {
  return postCall<PurchaseReceipt>(
    "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt",
    { source_name: poName },
  );
}

/** Build an unsaved Purchase Invoice from a submitted Purchase Order. */
export function makePurchaseInvoiceFromPO(poName: string): Promise<PurchaseInvoice> {
  return postCall<PurchaseInvoice>(
    "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_invoice",
    { source_name: poName },
  );
}

/** Build an unsaved Purchase Invoice from a submitted Purchase Receipt. */
export function makePurchaseInvoiceFromPR(prName: string): Promise<PurchaseInvoice> {
  return postCall<PurchaseInvoice>(
    "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice",
    { source_name: prName },
  );
}

/**
 * Build an unsaved Landed Cost Voucher pre-linked to one submitted Purchase
 * Receipt or stock-updating Purchase Invoice (its items are already fetched
 * server-side — see `LandedCostVoucher.get_items_from_purchase_receipts`).
 */
export function makeLandedCostVoucher(
  docType: LandedCostReceiptDocType,
  docName: string,
): Promise<LandedCostVoucher> {
  return postCall<LandedCostVoucher>(
    "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_lcv",
    { doctype: docType, docname: docName },
  );
}

/**
 * Build an unsaved Landed Cost Voucher from an Import Cost Sheet's charge
 * breakdown (freight/duty/insurance/... summed across all cost sheet items,
 * pre-filled as the taxes table).
 *
 * By default the voucher references the cost sheet's own linked Purchase
 * Receipt. Pass `referenceOverride` to instead reference a different
 * submitted document that shares this cost sheet's Purchase Order (e.g. a
 * stock-updating Purchase Invoice) — used when generating from that
 * document's own page, so the voucher lines up with what the user is
 * actually looking at while the charges still come from the cost sheet.
 */
export function makeLandedCostVoucherFromCostSheet(
  costSheetName: string,
  referenceOverride?: { receiptDoctype: LandedCostReceiptDocType; receiptDocument: string },
): Promise<LandedCostVoucher> {
  return callDocMethod<LandedCostVoucher>(
    "make_landed_cost_voucher",
    "Import Cost Sheet",
    costSheetName,
    referenceOverride
      ? {
          receipt_doctype: referenceOverride.receiptDoctype,
          receipt_document: referenceOverride.receiptDocument,
        }
      : undefined,
  );
}

/**
 * Re-run `get_items_from_purchase_receipts` against the given (possibly
 * unsaved, possibly locally-edited) Landed Cost Voucher and return the
 * refreshed document — used by the "Refresh Items" action so a newly added
 * voucher row picks up its items without discarding other in-progress edits.
 */
export function refreshLandedCostItems(doc: Record<string, unknown>): Promise<LandedCostVoucher> {
  return postCallForDoc<LandedCostVoucher>("get_items_from_purchase_receipts", {
    doctype: "Landed Cost Voucher",
    ...doc,
  });
}