/**
 * Client-side "Print" / "Export to PDF" for tabular data — no PDF library.
 * Renders the rows into a hidden iframe with a print-only stylesheet and
 * invokes the browser's native print dialog, where the user can print to
 * paper or choose "Save as PDF" as the destination.
 */

function escapeHtml(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Writes `html` into a hidden iframe and opens the browser's print dialog for it. */
function openPrintDialog(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Give the print dialog time to open before the iframe is torn down —
      // some browsers render the print preview from the live iframe content.
      setTimeout(cleanup, 1000);
    }
  };
}

const PAGE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .subtitle { font-size: 12px; color: #555; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .meta-row { margin-top: 16px; font-size: 10px; color: #888; }
  @page { size: auto; margin: 14mm; }
`;

function printPage(title: string, subtitle: string | undefined, tableHtml: string, rowCount: number) {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
  ${tableHtml}
  <p class="meta-row">Printed ${new Date().toLocaleString()} — ${rowCount} record${rowCount === 1 ? "" : "s"}</p>
</body>
</html>`;
  openPrintDialog(html);
}

export interface PrintColumn {
  key: string;
  label: string;
}

/** Open the browser's print dialog for a titled table of rows. */
export function printRows(title: string, columns: PrintColumn[], rows: Record<string, unknown>[], subtitle?: string) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join("")}</tr>`).join("");
  const table = `<style>
      th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; vertical-align: top; }
      th { background: #f2f2f2; font-weight: 600; }
      tbody tr:nth-child(even) { background: #fafafa; }
    </style>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="${columns.length}">No records</td></tr>`}</tbody>
    </table>`;
  printPage(title, subtitle, table, rows.length);
}

export interface PrintTreeRow {
  depth: number;
  code?: string;
  label: string;
  isGroup?: boolean;
  /** Right-aligned trailing text (e.g. root type, status). */
  meta?: string;
}

/** Open the browser's print dialog for an indented hierarchy (Chart of Accounts, Cost Center, ...). */
export function printTree(title: string, rows: PrintTreeRow[], subtitle?: string) {
  const body = rows
    .map((r) => {
      const code = r.code ? `<span class="code">${escapeHtml(r.code)}</span>` : "";
      return `<tr>
        <td style="padding-left:${8 + r.depth * 14}px" class="${r.isGroup ? "grp" : ""}">${code}${escapeHtml(r.label)}</td>
        <td class="meta">${escapeHtml(r.meta ?? "")}</td>
      </tr>`;
    })
    .join("");
  const table = `<style>
      table { font-size: 9px; }
      td { padding: 1px 6px; border-bottom: 1px solid #eee; vertical-align: baseline; }
      td.grp { font-weight: 700; }
      td.meta { text-align: right; color: #666; white-space: nowrap; }
      .code { display: inline-block; min-width: 34px; font-variant-numeric: tabular-nums; color: #888; margin-right: 5px; }
    </style>
    <table>
      <tbody>${body || `<tr><td>No records</td></tr>`}</tbody>
    </table>`;
  printPage(title, subtitle, table, rows.length);
}
