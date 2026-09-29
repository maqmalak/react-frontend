import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Edit3, Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getCall, humanizeError, postCall } from "@/services/frappe";

interface Entry { kind: "comment" | "change" | "email"; at: string; by: string; title: string; body?: string }

const when = (s: string) => new Date(s.replace(" ", "T")).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const strip = (html?: string) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Document timeline (comments, field changes, emails) with a comment box — the desk's form footer. */
export function ActivityPanel({ doctype, name }: { doctype: string; name: string }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const { data, mutate, isLoading } = useSWR(`activity:${doctype}:${name}`, async () => {
    const list = (dt: string, filters: unknown[], fields: string[]) =>
      getCall<Record<string, any>[]>("frappe.client.get_list", { doctype: dt, filters: JSON.stringify(filters), fields: JSON.stringify(fields), limit_page_length: 100, order_by: "creation desc" }).catch(() => []);
    const [comments, versions, emails] = await Promise.all([
      list("Comment", [["reference_doctype", "=", doctype], ["reference_name", "=", name], ["comment_type", "in", ["Comment", "Info", "Workflow", "Assigned", "Attachment"]]], ["creation", "owner", "comment_type", "content", "comment_email"]),
      list("Version", [["ref_doctype", "=", doctype], ["docname", "=", name]], ["creation", "owner", "data"]),
      list("Communication", [["reference_doctype", "=", doctype], ["reference_name", "=", name]], ["creation", "sender", "subject", "content", "sent_or_received"]),
    ]);
    const out: Entry[] = [
      ...comments.map((c) => ({ kind: "comment" as const, at: c.creation, by: c.comment_email || c.owner, title: c.comment_type === "Comment" ? "commented" : c.comment_type.toLowerCase(), body: strip(c.content) })),
      ...versions.map((v) => {
        let d: any = {};
        try { d = JSON.parse(v.data); } catch { /* ignore */ }
        const changed = (d.changed ?? []).map((c: any[]) => `${c[0]}: ${c[1] ?? "—"} → ${c[2] ?? "—"}`);
        const rows = (d.added?.length ? [`${d.added.length} row(s) added`] : []).concat(d.removed?.length ? [`${d.removed.length} row(s) removed`] : [], d.row_changed?.length ? [`${d.row_changed.length} row(s) changed`] : []);
        return { kind: "change" as const, at: v.creation, by: v.owner, title: d.created ? "created this document" : "changed", body: [...changed.slice(0, 6), ...rows].join(" · ") || "details updated" };
      }),
      ...emails.map((e) => ({ kind: "email" as const, at: e.creation, by: e.sender, title: `${e.sent_or_received === "Received" ? "received" : "sent"} an email`, body: `${e.subject ?? ""} — ${strip(e.content).slice(0, 180)}` })),
    ];
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, { revalidateOnFocus: false });

  const add = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await postCall("frappe.desk.form.utils.add_comment", { reference_doctype: doctype, reference_name: name, content: text.trim().replace(/\n/g, "<br>"), comment_email: "", comment_by: "" });
      setText("");
      void mutate();
    } catch (e) {
      toast.error(humanizeError(e));
    } finally {
      setSaving(false);
    }
  };

  const ICON = { comment: MessageSquare, change: Edit3, email: Mail };
  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="min-h-[72px]" />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void add()} disabled={saving || !text.trim()}><Send className="h-4 w-4" /> Comment</Button>
        </div>
      </Card>
      <Card className="p-5">
        {isLoading ? <div className="h-24 animate-pulse rounded bg-muted" /> : (data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {(data ?? []).map((e, i) => {
              const Icon = ICON[e.kind];
              return (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.95rem] flex h-6 w-6 items-center justify-center rounded-full bg-card ring-1 ring-border">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <p className="text-sm"><b className="font-semibold">{e.by}</b> <span className="text-muted-foreground">{e.title}</span> <span className="text-xs text-muted-foreground">· {when(e.at)}</span></p>
                  {e.body && <p className="mt-0.5 break-words text-xs text-muted-foreground">{e.body}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
