import axios, { type AxiosInstance } from "axios";

/**
 * Thin transport layer for the Frappe REST / RPC APIs.
 *
 * - Uses cookie/session authentication by default (same-origin or with CORS).
 * - For a standalone dev server the provider URL is `VITE_FRAPPE_URL`.
 * - Doc-controller methods (e.g. `make_sales_order`) must go through
 *   `run_doc_method` with `{ method, dt, dn }` — the SDK's generic
 *   `useFrappePostCall` posts to `/api/method/{method}` directly, which does
 *   not load the document server-side. (`frappe.client.call` does not exist
 *   in this Frappe version — confirmed against the live backend.)
 */

let baseURL = import.meta.env.VITE_FRAPPE_URL || "";

export function getBaseURL(): string {
  return baseURL;
}

/** Allow tests / modules to override the Frappe base URL. */
export function setBaseURL(url: string): void {
  baseURL = url.replace(/\/$/, "");
}

export const http: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

// Attach the CSRF token to every write request. When the SPA is served by
// Vite, `window.csrf_token` is populated at app bootstrap by
// `refreshCSRFToken()` below (called from AppProviders); when served by
// Frappe itself the template already injected it.
http.interceptors.request.use((config) => {
  const token = (window as unknown as { csrf_token?: string }).csrf_token;
  if (token && config.method && ["post", "put", "patch", "delete"].includes(config.method)) {
    config.headers["X-Frappe-CSRF-Token"] = token;
  }
  return config;
});

/**
 * Fetch a fresh CSRF token for the current session and cache it on
 * `window.csrf_token`. Called once at app bootstrap and after login/logout
 * (see AppProviders / useAuth), and automatically by the retry interceptor
 * below whenever a request is rejected for a stale token — the cached token
 * is fetched once per page load, so it goes stale the moment the session's
 * real token rotates (a re-login, a cache clear, a backend restart, ...).
 */
export async function refreshCSRFToken(): Promise<void> {
  try {
    const res = await fetch("/api/method/frappe.auth.get_csrf_token", {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { message?: string };
    if (data?.message) {
      (window as unknown as { csrf_token?: string }).csrf_token = data.message;
    }
  } catch {
    /* CSRF bootstrap is best-effort; GETs still work unauthenticated. */
  }
}

function isCSRFTokenError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data as Record<string, any> | undefined;
  if (!data) return false;
  if (data.exc_type === "CSRFTokenError") return true;
  const text = [data._error_message, data.message, data._server_messages]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  return text.includes("csrf");
}

let csrfRefreshPromise: Promise<void> | null = null;

// Auto-recover from a stale cached CSRF token (typically after the backend
// restarts or the session cache clears while the tab stays open): fetch a
// fresh token and retry the request exactly once, before the generic error
// handler below ever sees it as a hard failure.
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = axios.isAxiosError(error) ? (error.config as any) : undefined;
    if (config && !config._csrfRetried && isCSRFTokenError(error)) {
      config._csrfRetried = true;
      if (!csrfRefreshPromise) {
        csrfRefreshPromise = refreshCSRFToken().finally(() => {
          csrfRefreshPromise = null;
        });
      }
      await csrfRefreshPromise;
      return http(config);
    }
    return Promise.reject(error);
  },
);

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Session expired / not authenticated (a recovered CSRF error never
      // reaches here — see the retry interceptor above).
      if (status === 401 || status === 403) {
        window.dispatchEvent(new CustomEvent("apparel:session-expired"));
      }
      const msg =
        (error.response?.data as any)?.exc_type ??
        (error.response?.data as any)?.message ??
        error.message;
      return Promise.reject(new Error(msg || "Request failed"));
    }
    return Promise.reject(error);
  },
);

function wrap<T>(promise: Promise<{ data: { message?: T } }>): Promise<T> {
  return promise.then((res) => res.data.message as T);
}

/** Generic GET to a whitelisted method (`frappe.call`-style resource read). */
export function getCall<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  return wrap<T>(http.get(`/api/method/${method}`, { params }));
}

/** Generic POST to a whitelisted module-level method. */
export function postCall<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  return wrap<T>(http.post(`/api/method/${method}`, params ?? {}));
}

/**
 * Call `run_doc_method` (Frappe's endpoint for whitelisted Document *instance*
 * methods, e.g. `LandedCostVoucher.get_items_from_purchase_receipts`). Unlike
 * `postCall`, the updated document comes back on `response.docs[0]`, not
 * `response.message` — that method mutates the doc in place and returns
 * nothing, while `run_doc_method` always echoes the (possibly modified) doc.
 *
 * `docs` may be an existing saved doc (loaded fresh, `check_if_latest` applies)
 * or a plain object describing an unsaved doc (no `name`) — either way pass the
 * full current doc so any locally-edited-but-unsaved fields are respected.
 */
export function postCallForDoc<T = unknown>(
  method: string,
  docs: Record<string, unknown>,
): Promise<T> {
  return http
    .post("/api/method/run_doc_method", { method, docs: JSON.stringify(docs) })
    .then((res) => (res.data as { docs?: T[] }).docs?.[0] as T);
}

/**
 * Call a whitelisted DocType controller method (e.g. `make_sales_order`) via
 * `frappe.client.call`. This loads the document server-side with session
 * permissions enforced.
 */
export function callDocMethod<T = unknown>(
  method: string,
  doctype: string,
  docname: string,
  extra?: Record<string, unknown>,
): Promise<T> {
  return wrap<T>(
    http.post("/api/method/run_doc_method", {
      method,
      dt: doctype,
      dn: docname,
      args: extra ?? {},
    }),
  );
}

/** Build an absolute file URL for attachments (private files need auth token/session). */
export function fileURL(fileUrl?: string): string {
  if (!fileUrl) return "";
  if (/^https?:\/\//.test(fileUrl)) return fileUrl;
  const base = getBaseURL();
  return `${base}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
}

/**
 * Create a Sales Order from an LC Proforma via its whitelisted doc method.
 *
 * `make_sales_order` is a Document *instance* method (LCProforma.make_sales_order),
 * not a module-level function, so `run_doc_method` needs the bare method name
 * (it resolves it as `getattr(doc, method)`) — not the dotted module path.
 */
export async function createSalesOrderFromLC(lcName: string): Promise<string> {
  return callDocMethod<string>("make_sales_order", "LC Proforma", lcName);
}

/** Convert server-side Frappe messages into a readable error string. */
export function humanizeError(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";
  if (typeof error === "string") return error;

  const anyErr = error as Record<string, any>;

  // frappe-react-sdk / Frappe REST often puts messages in _server_messages (JSON string of JSON strings).
  const serverMessages =
    anyErr?._server_messages ??
    anyErr?.response?.data?._server_messages ??
    anyErr?.data?._server_messages;
  if (serverMessages) {
    try {
      const list = typeof serverMessages === "string" ? JSON.parse(serverMessages) : serverMessages;
      const parts = (Array.isArray(list) ? list : [list]).map((entry: unknown) => {
        try {
          const obj = typeof entry === "string" ? JSON.parse(entry) : entry;
          return (obj as any)?.message ?? String(entry);
        } catch {
          return String(entry);
        }
      });
      const joined = parts.filter(Boolean).join(" ").trim();
      if (joined) return stripHtml(joined);
    } catch {
      /* fall through */
    }
  }

  const candidates = [
    anyErr?.message,
    anyErr?.exception,
    anyErr?.exc,
    anyErr?.response?.data?.message,
    anyErr?.response?.data?.exc_type,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return stripHtml(c);
  }

  if (error instanceof Error && error.message) return stripHtml(error.message);
  return "Something went wrong. Please try again.";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}