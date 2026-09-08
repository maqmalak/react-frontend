import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFrappeGetDocList, useFrappeCreateDoc } from "frappe-react-sdk";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight, Mail, Send, Link2, CalendarDays, ListTodo, Inbox } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postCall, humanizeError } from "@/services/frappe";
import { formatDateTime } from "@/utils/dates";

/** Email row from the Communication doctype (filtered to a document). */
export interface DocEmail {
  name: string;
  subject: string;
  sender: string;
  recipients: string;
  content: string;
  sent_or_received: string;
  creation: string;
}

/** Strip HTML tags & collapse whitespace for a plain-text preview. */
function textPreview(html: string, max = 140): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const EMAIL_FIELDS = [
  "name", "subject", "sender", "recipients", "content", "sent_or_received", "creation",
] as const;

/** One entry in a connections group. */
export interface ConnectionItem {
  label: string;
  sub?: string;
  /** Internal route — renders as a link; otherwise a static row. */
  to?: string;
  tone?: "sky" | "indigo" | "amber" | "emerald" | "slate";
}

export interface ConnectionGroup {
  title: string;
  items: ConnectionItem[];
}

const TONE_CHIP: Record<NonNullable<ConnectionItem["tone"]>, string> = {
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

export const CONNECTION_ICONS = { mail: Mail, calendar: CalendarDays, task: ListTodo, link: Link2 } as const;

/**
 * Emails attached to a document (Communication.reference_doctype/docname),
 * with an inbox-style list and a compose box. If the backend has no outgoing
 * email account configured, the message is still logged as a sent
 * Communication so the thread is preserved.
 */
export function EmailPanel({
  referenceDoctype,
  referenceDocname,
  defaultRecipient,
  className,
}: {
  referenceDoctype: string;
  referenceDocname?: string;
  defaultRecipient?: string;
  className?: string;
}) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState(defaultRecipient ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { createDoc: logCommunication } = useFrappeCreateDoc();

  const { data: emails, isLoading, mutate } = useFrappeGetDocList<DocEmail>("Communication", {
    fields: [...EMAIL_FIELDS],
    filters: [
      ["reference_doctype", "=", referenceDoctype],
      ["reference_docname", "=", referenceDocname ?? ""],
      ["communication_medium", "=", "Email"],
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 50,
  }, referenceDocname ? `apparel.doc.emails.${referenceDocname}` : null);

  const send = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      toast.error("To, subject and message are required");
      return;
    }
    setSending(true);
    try {
      await postCall("frappe.core.doctype.communication.email.make", {
        recipients: to.trim(),
        subject: subject.trim(),
        content: message.trim(),
        doctype: referenceDoctype,
        name: referenceDocname,
        send_email: true,
      });
      toast.success("Email sent");
    } catch (err) {
      const msg = humanizeError(err);
      if (/email account|outgoing/i.test(msg)) {
        // No SMTP configured on the backend — log it so the thread is kept.
        try {
          await logCommunication("Communication", {
            communication_type: "Communication",
            communication_medium: "Email",
            sent_or_received: "Sent",
            subject: subject.trim(),
            content: message.trim(),
            recipients: to.trim(),
            reference_doctype: referenceDoctype,
            reference_docname: referenceDocname,
          });
          toast.success("No outgoing mail server configured — email logged to the thread");
        } catch (logErr) {
          toast.error(humanizeError(logErr));
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setSending(false);
      setComposeOpen(false);
      setSubject("");
      setMessage("");
      void mutate();
    }
  };

  return (
    <SectionCard
      title="Emails"
      className={className}
      actions={
        <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
          <Mail className="h-3.5 w-3.5" /> Compose
        </Button>
      }
    >
      {composeOpen && (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="email-to" className="text-xs">To</Label>
              <Input id="email-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-subject" className="text-xs">Subject</Label>
              <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email-body" className="text-xs">Message</Label>
            <Textarea id="email-body" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your email…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => void send()} disabled={sending}>
              <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading emails…</p>
      ) : (emails ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <Inbox className="h-5 w-5 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No emails yet — start the conversation.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(emails ?? []).map((e) => {
            const isOpen = expanded === e.name;
            return (
              <li key={e.name} className="rounded-lg border border-border transition-colors hover:bg-accent/40">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 p-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : e.name)}
                >
                  <span className="mt-0.5 rounded-full bg-sky-100 p-1.5 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                    {e.sent_or_received === "Sent" ? <Send className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{e.subject || "(no subject)"}</span>
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </span>
                    {!isOpen && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{textPreview(e.content)}</span>
                    )}
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{e.sent_or_received}</Badge>
                      <span className="truncate">{e.sent_or_received === "Sent" ? `to ${e.recipients}` : `from ${e.sender}`}</span>
                      <span>· {formatDateTime(e.creation)}</span>
                    </span>
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-3 py-2 text-sm text-foreground/90">
                    <div dangerouslySetInnerHTML={{ __html: e.content }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/** Card listing everything connected to a record — cross-linked docs, events, tasks. */
export function ConnectionsPanel({
  groups,
  className,
  loading,
}: {
  groups: ConnectionGroup[];
  className?: string;
  loading?: boolean;
}) {
  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);
  return (
    <SectionCard
      title="Connections"
      className={className}
      actions={<Badge variant="outline" className="text-[11px]">{loading ? "…" : total} linked</Badge>}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading connections…</p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing connected yet. Link deals, schedule activities or create follow-ups.</p>
      ) : (
        <div className="space-y-4">
          {groups.filter((g) => g.items.length > 0).map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
              <ul className="space-y-1.5">
                {g.items.map((item) => {
                  const body = (
                    <>
                      <span className={`rounded-full p-1.5 ${TONE_CHIP[item.tone ?? "slate"]}`}>
                        <Link2 className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        {item.sub && <span className="block truncate text-xs text-muted-foreground">{item.sub}</span>}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </>
                  );
                  const cls = "flex w-full items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-accent/40";
                  return (
                    <li key={`${g.title}-${item.label}-${item.to ?? ""}`}>
                      {item.to ? (
                        <Link to={item.to} className={cls}>{body}</Link>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/** Events linked to a document via the Event Participants child table. */
export function useLinkedEvents(referenceDoctype: string, referenceDocname?: string) {
  const participants = useFrappeGetDocList<{ parent: string }>("Event Participants", {
    fields: ["parent"],
    filters: [
      ["reference_doctype", "=", referenceDoctype],
      ["reference_docname", "=", referenceDocname ?? ""],
    ],
    limit: 50,
  }, referenceDocname ? `apparel.doc.eventparticipants.${referenceDocname}` : null);

  const eventNames = useMemo(
    () => Array.from(new Set((participants.data ?? []).map((p) => p.parent))),
    [participants.data],
  );

  const events = useFrappeGetDocList<{ name: string; subject: string; starts_on: string; event_type: string }>("Event", {
    fields: ["name", "subject", "starts_on", "event_type"],
    filters: [["name", "in", eventNames]],
    orderBy: { field: "starts_on", order: "asc" },
    limit: 50,
  }, eventNames.length ? `apparel.doc.events.${eventNames.join(",")}` : null);

  return {
    events: events.data ?? [],
    isLoading: participants.isLoading || events.isLoading,
    mutate: () => { void participants.mutate(); void events.mutate(); },
  };
}

