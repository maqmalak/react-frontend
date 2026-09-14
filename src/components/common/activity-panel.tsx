import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useFrappeDeleteDoc, useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";
import { Mail, Monitor, Paperclip, Plus, Share2, Tag as TagIcon, UserPlus, X } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { FrappeLinkField } from "@/components/forms/field-primitives";
import { postCall, uploadFile, stripHtml, humanizeError, type FrappeFile } from "@/services/frappe";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/utils/dates";
import { cn } from "@/utils/cn";
import type { FrappeComment, FrappeToDo, FrappeVersion } from "@/types/frappe";

function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function summarizeVersion(v: FrappeVersion): string {
  try {
    const parsed = JSON.parse(v.data) as { changed?: any[]; added?: any[]; removed?: any[] };
    const changed = parsed.changed ?? [];
    const docstatusChange = changed.find((c) => c[0] === "docstatus");
    if (docstatusChange) {
      if (docstatusChange[2] === 1) return "submitted this document";
      if (docstatusChange[2] === 2) return "cancelled this document";
      if (docstatusChange[2] === 0) return "reverted this document to draft";
    }
    const addedCount = (parsed.added ?? []).reduce(
      (s, entry) => s + (Array.isArray(entry?.[1]) ? entry[1].length : 0),
      0,
    );
    const removedCount = (parsed.removed ?? []).reduce(
      (s, entry) => s + (Array.isArray(entry?.[1]) ? entry[1].length : 0),
      0,
    );
    if (addedCount) return `added ${addedCount} row${addedCount === 1 ? "" : "s"}`;
    if (removedCount) return `removed ${removedCount} row${removedCount === 1 ? "" : "s"}`;
    const n = changed.length;
    return n ? `updated ${n} field${n === 1 ? "" : "s"}` : "updated this document";
  } catch {
    return "updated this document";
  }
}

/** "Add to ToDo" dialog — mirrors the Frappe desk assignment form (assign to me, users, priority, complete by, comment). */
function AssignDialog({
  doctype,
  docname,
  open,
  onClose,
  onAssigned,
}: {
  doctype: string;
  docname: string;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { currentUser } = useAuth();
  const [assignToMe, setAssignToMe] = useState(false);
  const [pendingUser, setPendingUser] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [priority, setPriority] = useState("Medium");
  const [completeBy, setCompleteBy] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAssignToMe(false);
    setPendingUser("");
    setUsers([]);
    setPriority("Medium");
    setCompleteBy("");
    setComment("");
  };

  const submit = async () => {
    const assignees = [...users, ...(assignToMe && currentUser ? [currentUser] : [])];
    if (!assignees.length) {
      toast.error("Add at least one user to assign to");
      return;
    }
    setSaving(true);
    try {
      await postCall("frappe.desk.form.assign_to.add", {
        doctype,
        name: docname,
        assign_to: JSON.stringify(assignees),
        priority,
        date: completeBy || undefined,
        description: comment || undefined,
      });
      reset();
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add to ToDo" size="md">
      <div className="space-y-4">
        <Checkbox label="Assign to me" checked={assignToMe} onChange={(e) => setAssignToMe(e.target.checked)} />
        <div>
          <Label required>Assign To</Label>
          <div className="flex gap-2">
            <FrappeLinkField
              meta={{ fieldname: "assign_to", fieldtype: "Link", options: "User" }}
              value={pendingUser}
              onChange={(v) => {
                setPendingUser(v);
                if (v) setUsers((prev) => (prev.includes(v) ? prev : [...prev, v]));
                setPendingUser("");
              }}
            />
          </div>
          {users.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {users.map((u) => (
                <Badge key={u} variant="outline" className="gap-1 pr-1">
                  {u}
                  <button
                    onClick={() => setUsers((prev) => prev.filter((x) => x !== u))}
                    className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${u}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Complete By</Label>
            <Input type="date" value={completeBy} onChange={(e) => setCompleteBy(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Comment</Label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={() => void submit()} disabled={saving}>
          Add
        </Button>
      </div>
    </Dialog>
  );
}

/** "Assigned To" sidebar card — lives alongside the document form, not in the activity feed. Pass `inTab` to render just the body (used inside `DocActionsPanel`). */
export function AssignedToCard({
  doctype,
  docname,
  inTab = false,
}: { doctype: string; docname?: string; inTab?: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const enabled = Boolean(docname);

  const { data: todos, mutate: mutateTodos } = useFrappeGetDocList<FrappeToDo>(
    "ToDo",
    {
      fields: ["name", "allocated_to", "status", "priority", "description", "creation"] as any,
      filters: [
        ["reference_type", "=", doctype],
        ["reference_name", "=", docname ?? ""],
        ["status", "=", "Open"],
      ] as any,
      orderBy: { field: "creation", order: "desc" },
      limit: 20,
    },
    enabled ? `activity.todos.${doctype}.${docname}` : null,
  );

    if (!enabled) {
    return inTab ? (
      <p className="py-1 text-sm text-muted-foreground">Save to enable assignments</p>
    ) : (
      <SectionCard title="Assigned To">
        <EmptyState title="Save to enable assignments" />
      </SectionCard>
    );
  }

  const removeAssignment = async (todo: FrappeToDo) => {
    try {
      await postCall("frappe.desk.form.assign_to.remove", { doctype, name: docname, assign_to: todo.allocated_to });
      void mutateTodos();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

    const body = (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <UserPlus className="h-4 w-4 text-primary" /> Assign
      </Button>
      {!todos?.length ? (
        inTab ? null : <EmptyState title="No assignments" />
      ) : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t.name} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={t.allocated_to} size="sm" />
                <span className="truncate text-sm">{t.allocated_to}</span>
                {t.priority && <Badge variant="outline">{t.priority}</Badge>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => void removeAssignment(t)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {docname && (
        <AssignDialog
          doctype={doctype}
          docname={docname}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onAssigned={() => void mutateTodos()}
        />
      )}
    </>
  );
  return inTab ? (
    body
  ) : (
    <SectionCard title="Assigned To" contentClassName="space-y-3">
      {body}
    </SectionCard>
  );
}

/** "Upload" dialog — mirrors the Frappe desk file uploader (drag-and-drop zone + device picker + private toggle). */
function UploadDialog({
  open,
  onClose,
  onUpload,
  uploading,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (files: FileList, isPrivate: boolean) => void;
  uploading: boolean;
}) {
  const [isPrivate, setIsPrivate] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setPendingFiles(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Upload" size="md">
      <div
        className={cn(
          "rounded-md border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) setPendingFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => setPendingFiles(e.target.files)}
        />
        {pendingFiles?.length ? (
          <p className="text-sm">{Array.from(pendingFiles).map((f) => f.name).join(", ")}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">Drag and drop files here or upload from</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mx-auto flex flex-col items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Monitor className="h-4 w-4" />
              </span>
              My Device
            </button>
          </>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Checkbox label="Set all private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (pendingFiles?.length) onUpload(pendingFiles, isPrivate);
          }}
          disabled={!pendingFiles?.length || uploading}
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </Dialog>
  );
}

/** File attachments — list/upload/remove via Frappe's standard `File` doctype + `/api/method/upload_file`. Pass `inTab` to render just the body (used inside `DocActionsPanel`). */
export function AttachmentsCard({
  doctype,
  docname,
  inTab = false,
}: { doctype: string; docname?: string; inTab?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { deleteDoc } = useFrappeDeleteDoc();
  const enabled = Boolean(docname);

  const { data: files, mutate } = useFrappeGetDocList<FrappeFile>(
    "File",
    {
      fields: ["name", "file_name", "file_url", "file_size", "is_private", "creation"] as any,
      filters: [
        ["attached_to_doctype", "=", doctype],
        ["attached_to_name", "=", docname ?? ""],
      ] as any,
      orderBy: { field: "creation", order: "desc" },
      limit: 50,
    },
    enabled ? `activity.files.${doctype}.${docname}` : null,
  );

    if (!enabled) {
    return inTab ? (
      <p className="py-1 text-sm text-muted-foreground">Save to enable attachments</p>
    ) : (
      <SectionCard title="Attachments">
        <EmptyState title="Save to enable attachments" />
      </SectionCard>
    );
  }

  const handleFiles = async (fileList: FileList, isPrivate: boolean) => {
    if (!fileList.length || !docname) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        await uploadFile(file, { doctype, docname, isPrivate });
      }
      void mutate();
      setDialogOpen(false);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (file: FrappeFile) => {
    try {
      await deleteDoc("File", file.name);
      void mutate();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

    const body = (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} disabled={uploading}>
        <Paperclip className="h-4 w-4 text-primary" /> {uploading ? "Uploading…" : "Attach File"}
      </Button>
      {docname && (
        <UploadDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onUpload={(f, p) => void handleFiles(f, p)}
          uploading={uploading}
        />
      )}
      {!files?.length ? (
        inTab ? null : <EmptyState title="No attachments" />
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.name} className="flex items-center justify-between gap-2">
              <a
                href={f.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm text-primary hover:underline"
                title={f.file_name}
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{f.file_name}</span>
                {f.file_size ? (
                  <span className="shrink-0 text-xs text-muted-foreground">({formatBytes(f.file_size)})</span>
                ) : null}
              </a>
              <Button size="icon" variant="ghost" onClick={() => void removeFile(f)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
  return inTab ? (
    body
  ) : (
    <SectionCard title="Attachments" contentClassName="space-y-3">
      {body}
    </SectionCard>
  );
}

/** Document tags (Frappe's `_user_tags`) — add/remove via the standard `frappe.desk.doctype.tag.tag.*` methods. Pass `inTab` to render just the body (used inside `DocActionsPanel`). */
export function TagsCard({
  doctype,
  docname,
  inTab = false,
}: { doctype: string; docname?: string; inTab?: boolean }) {
  const [newTag, setNewTag] = useState("");
  const [adding, setAdding] = useState(false);
  const enabled = Boolean(docname);

  const { data: tagsResponse, mutate } = useFrappeGetCall<
    { _user_tags?: string } | { message?: { _user_tags?: string } }
  >(
    "frappe.client.get_value",
    { doctype, fieldname: JSON.stringify(["_user_tags"]), filters: JSON.stringify({ name: docname ?? "" }) },
    enabled ? `activity.tags.${doctype}.${docname}` : null,
  );
  const userTagsRaw =
    (tagsResponse as { _user_tags?: string } | undefined)?._user_tags ??
    (tagsResponse as { message?: { _user_tags?: string } } | undefined)?.message?._user_tags ??
    "";
  const tags = userTagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

    if (!enabled) {
    return inTab ? (
      <p className="py-1 text-sm text-muted-foreground">Save to enable tags</p>
    ) : (
      <SectionCard title="Tags">
        <EmptyState title="Save to enable tags" />
      </SectionCard>
    );
  }

    const addTag = async () => {
    const tag = newTag.trim();
    if (!tag) return;
    setAdding(true);
    try {
      await postCall("frappe.desk.doctype.tag.tag.add_tag", { tag, dt: doctype, dn: docname });
      setNewTag("");
      void mutate();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setAdding(false);
    }
  };

  const removeTag = async (tag: string) => {
    try {
      await postCall("frappe.desk.doctype.tag.tag.remove_tag", { tag, dt: doctype, dn: docname });
      void mutate();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

  const body = (
    <>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add a tag…"
          onKeyDown={(e) => {
            if (e.key === "Enter") void addTag();
          }}
        />
        <Button variant="primary" size="icon" onClick={() => void addTag()} disabled={!newTag.trim() || adding}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length === 0 ? (
        inTab ? null : <EmptyState title="No tags" />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="gap-1 pr-1">
              <TagIcon className="h-3 w-3" />
              {tag}
              <button
                onClick={() => void removeTag(tag)}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </>
  );
  return inTab ? (
    body
  ) : (
    <SectionCard title="Tags" contentClassName="space-y-3">
      {body}
    </SectionCard>
  );
}

interface DocShareRow {
  name: string;
  user: string;
  read: number;
  write: number;
  submit: number;
  share: number;
  everyone: number;
}

type SharePermission = "read" | "write" | "submit" | "share";
const SHARE_PERMISSIONS: SharePermission[] = ["read", "write", "submit", "share"];

/** "Share ... with" dialog — mirrors the Frappe desk share form (Everyone row + a permissions table per user). */
function ShareDialog({
  doctype,
  docname,
  shares,
  everyoneShare,
  open,
  onClose,
  onChanged,
}: {
  doctype: string;
  docname: string;
  shares: DocShareRow[];
  everyoneShare?: DocShareRow;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newUser, setNewUser] = useState("");
  const [newPerms, setNewPerms] = useState<Record<SharePermission, boolean>>({
    read: true,
    write: false,
    submit: false,
    share: false,
  });
  const [busy, setBusy] = useState(false);

  const togglePermission = async (user: string | null, everyone: boolean, permission_to: SharePermission, value: boolean) => {
    setBusy(true);
    try {
      await postCall("frappe.share.set_permission", {
        doctype,
        name: docname,
        // `user` is a required positional arg server-side (str | None, no
        // default) — it must be present in the request body even for the
        // "Everyone" row, so `null` here (not `undefined`, which JSON.stringify
        // would drop the key for entirely and trip a "missing argument" error).
        user: user ?? null,
        permission_to,
        value: value ? 1 : 0,
        everyone: everyone ? 1 : 0,
      });
      onChanged();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(false);
    }
  };

  const addShare = async () => {
    const user = newUser.trim();
    if (!user) return;
    setBusy(true);
    try {
      await postCall("frappe.share.add", {
        doctype,
        name: docname,
        user,
        read: 1,
        write: newPerms.write ? 1 : 0,
        submit: newPerms.submit ? 1 : 0,
        share: newPerms.share ? 1 : 0,
      });
      setNewUser("");
      setNewPerms({ read: true, write: false, submit: false, share: false });
      onChanged();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Share ${docname} with`} size="lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">User</th>
              {SHARE_PERMISSIONS.map((p) => (
                <th key={p} className="py-2 text-center font-medium capitalize">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-2 font-medium">Everyone</td>
              {SHARE_PERMISSIONS.map((p) => (
                <td key={p} className="text-center">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    disabled={busy}
                    checked={!!everyoneShare?.[p]}
                    onChange={(e) => void togglePermission(null, true, p, e.target.checked)}
                  />
                </td>
              ))}
            </tr>
            {shares.map((s) => (
              <tr key={s.name} className="border-t border-border">
                <td className="py-2">{s.user}</td>
                {SHARE_PERMISSIONS.map((p) => (
                  <td key={p} className="text-center">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      disabled={busy}
                      checked={!!s[p]}
                      onChange={(e) => void togglePermission(s.user, false, p, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <Label>Share this document with</Label>
        <div className="flex flex-wrap items-center gap-3">
          <FrappeLinkField
            meta={{ fieldname: "share_user", fieldtype: "Link", options: "User" }}
            value={newUser}
            onChange={setNewUser}
          />
          {(["write", "submit", "share"] as const).map((p) => (
            <Checkbox
              key={p}
              label={p[0].toUpperCase() + p.slice(1)}
              checked={newPerms[p]}
              onChange={(e) => setNewPerms((prev) => ({ ...prev, [p]: e.target.checked }))}
            />
          ))}
          <Button variant="primary" size="sm" onClick={() => void addShare()} disabled={!newUser || busy}>
            Add
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Who this document is shared with — add/remove via the standard `frappe.share.*` methods. Pass `inTab` to render just the body (used inside `DocActionsPanel`). */
export function SharedWithCard({
  doctype,
  docname,
  inTab = false,
}: { doctype: string; docname?: string; inTab?: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const enabled = Boolean(docname);

  const { data: sharesResponse, mutate } = useFrappeGetCall<DocShareRow[] | { message?: DocShareRow[] }>(
    "frappe.share.get_users",
    { doctype, name: docname ?? "" },
    enabled ? `activity.shares.${doctype}.${docname}` : null,
  );
  const shares: DocShareRow[] = Array.isArray(sharesResponse)
    ? sharesResponse
    : Array.isArray((sharesResponse as { message?: DocShareRow[] } | undefined)?.message)
      ? (sharesResponse as { message: DocShareRow[] }).message
      : [];
  const sharedUsers = shares.filter((s) => !s.everyone);
  const everyoneShare = shares.find((s) => s.everyone);

    if (!enabled) {
    return inTab ? (
      <p className="py-1 text-sm text-muted-foreground">Save to enable sharing</p>
    ) : (
      <SectionCard title="Shared With">
        <EmptyState title="Save to enable sharing" />
      </SectionCard>
    );
  }

    const body = (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <Share2 className="h-4 w-4 text-primary" /> Share
      </Button>
      {sharedUsers.length === 0 ? (
        inTab ? null : <EmptyState title="Not shared with anyone" />
      ) : (
        <ul className="space-y-2">
          {sharedUsers.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={s.user} size="sm" />
                <span className="truncate text-sm">{s.user}</span>
                <Badge variant="outline">{s.write ? "Edit" : "View"}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
      {docname && (
        <ShareDialog
          doctype={doctype}
          docname={docname}
          shares={sharedUsers}
          everyoneShare={everyoneShare}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onChanged={() => void mutate()}
        />
      )}
    </>
  );
  return inTab ? (
    body
  ) : (
    <SectionCard title="Shared With" contentClassName="space-y-3">
      {body}
    </SectionCard>
  );
}

/**
 * Full-width Comments + Activity feed for a saved document — mirrors the
 * Frappe desk convention of a connected timeline below the document body
 * (comments render as cards, version-log changes render as plain entries,
 * merged and sorted newest-first on one connector line).
 */
interface FrappeCommunication {
  name: string;
  subject?: string;
  sender?: string;
  recipients?: string;
  content?: string;
  communication_date?: string;
  sent_or_received?: string;
}

/** "New Email" compose dialog — mirrors the Frappe desk email form (To, Subject, Message, copy/receipt options). */
function EmailDialog({
  doctype,
  docname,
  defaultSubject,
  open,
  onClose,
  onSent,
}: {
  doctype: string;
  docname: string;
  defaultSubject: string;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [sendCopy, setSendCopy] = useState(false);
  const [readReceipt, setReadReceipt] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!recipients.trim() || !subject.trim()) {
      toast.error("Recipients and subject are required");
      return;
    }
    setSending(true);
    try {
      await postCall("frappe.core.doctype.communication.email.make", {
        doctype,
        name: docname,
        recipients: recipients.trim(),
        subject: subject.trim(),
        content: message.trim() || subject.trim(),
        send_email: 1,
        send_me_a_copy: sendCopy ? 1 : 0,
        read_receipt: readReceipt ? 1 : 0,
      });
      setRecipients("");
      setSubject(defaultSubject);
      setMessage("");
      setSendCopy(false);
      setReadReceipt(false);
      onSent();
      onClose();
      toast.success("Email sent");
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New Email" size="lg">
      <div className="space-y-4">
        <div>
          <Label required>To</Label>
          <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="name@example.com" />
        </div>
        <div>
          <Label required>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} />
        </div>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="Send me a copy" checked={sendCopy} onChange={(e) => setSendCopy(e.target.checked)} />
          <Checkbox label="Send Read Receipt" checked={readReceipt} onChange={(e) => setReadReceipt(e.target.checked)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={sending}>
          Discard
        </Button>
        <Button variant="primary" onClick={() => void send()} disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </Dialog>
  );
}

/**
 * Full-width Comments + Activity feed for a saved document — mirrors the
 * Frappe desk convention of a connected timeline below the document body
 * (comments and emails render as cards, version-log changes render as plain
 * entries, merged and sorted newest-first on one connector line).
 */
export function ActivityTimeline({ doctype, docname }: { doctype: string; docname?: string }) {
  const { currentUser, user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const enabled = Boolean(docname);

  const { data: comments, mutate: mutateComments } = useFrappeGetDocList<FrappeComment>(
    "Comment",
    {
      fields: ["name", "content", "comment_by", "comment_email", "owner", "creation"] as any,
      filters: [
        ["reference_doctype", "=", doctype],
        ["reference_name", "=", docname ?? ""],
        ["comment_type", "=", "Comment"],
      ] as any,
      orderBy: { field: "creation", order: "desc" },
      limit: 50,
    },
    enabled ? `activity.comments.${doctype}.${docname}` : null,
  );

  const { data: versions } = useFrappeGetDocList<FrappeVersion>(
    "Version",
    {
      fields: ["name", "owner", "creation", "data"] as any,
      filters: [
        ["ref_doctype", "=", doctype],
        ["docname", "=", docname ?? ""],
      ] as any,
      orderBy: { field: "creation", order: "desc" },
      limit: 20,
    },
    enabled ? `activity.versions.${doctype}.${docname}` : null,
  );

  const { data: emails, mutate: mutateEmails } = useFrappeGetDocList<FrappeCommunication>(
    "Communication",
    {
      fields: ["name", "subject", "sender", "recipients", "content", "communication_date"] as any,
      filters: [
        ["reference_doctype", "=", doctype],
        ["reference_name", "=", docname ?? ""],
        ["communication_type", "=", "Communication"],
        ["communication_medium", "=", "Email"],
      ] as any,
      orderBy: { field: "communication_date", order: "desc" },
      limit: 20,
    },
    enabled ? `activity.emails.${doctype}.${docname}` : null,
  );

  if (!enabled) {
    return (
      <SectionCard title="Activity">
        <EmptyState
          title="Save to enable activity"
          description="Comments and change history become available after the first save."
        />
      </SectionCard>
    );
  }

  const addComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setPosting(true);
    try {
      await postCall("frappe.desk.form.utils.add_comment", {
        reference_doctype: doctype,
        reference_name: docname,
        content: text,
        comment_email: currentUser ?? undefined,
        comment_by: user?.full_name ?? currentUser ?? undefined,
      });
      setCommentText("");
      void mutateComments();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setPosting(false);
    }
  };

  type Entry =
    | { kind: "comment"; key: string; creation: string; comment: FrappeComment }
    | { kind: "version"; key: string; creation: string; version: FrappeVersion }
    | { kind: "email"; key: string; creation: string; email: FrappeCommunication };

  const entries: Entry[] = [
    ...(comments ?? []).map((c): Entry => ({ kind: "comment", key: `c-${c.name}`, creation: c.creation, comment: c })),
    ...(versions ?? []).map((v): Entry => ({ kind: "version", key: `v-${v.name}`, creation: v.creation, version: v })),
    ...(emails ?? []).map(
      (e): Entry => ({ kind: "email", key: `e-${e.name}`, creation: e.communication_date ?? "", email: e }),
    ),
  ].sort((a, b) => (a.creation < b.creation ? 1 : -1));

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Comments${comments?.length ? ` (${comments.length})` : ""}`}
        actions={
          docname ? (
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="h-4 w-4 text-primary" /> New Email
            </Button>
          ) : undefined
        }
      >
        <div className="flex gap-2">
          <Avatar name={user?.full_name ?? currentUser ?? undefined} size="sm" />
          <div className="flex-1 space-y-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
            />
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => void addComment()} disabled={!commentText.trim() || posting}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {docname && (
        <EmailDialog
          doctype={doctype}
          docname={docname}
          defaultSubject={`${doctype} - ${docname}`}
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          onSent={() => void mutateEmails()}
        />
      )}

      <SectionCard title="Activity">
        {entries.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul>
            {entries.map((e, i) => {
              const last = i === entries.length - 1;
              const name =
                e.kind === "comment"
                  ? e.comment.comment_by || e.comment.comment_email
                  : e.kind === "email"
                    ? e.email.sender
                    : e.version.owner;
              return (
                <li key={e.key} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 bg-border"
                    />
                  )}
                  <Avatar name={name} size="sm" className="relative z-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {e.kind === "comment" ? (
                      <div className="rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{name}</span> commented ·{" "}
                          {formatDateTime(e.creation)}
                        </p>
                        <p className="mt-1 text-sm">{stripHtml(e.comment.content)}</p>
                      </div>
                    ) : e.kind === "email" ? (
                      <div className="rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{name}</span> emailed {e.email.recipients} ·{" "}
                          {formatDateTime(e.creation)}
                        </p>
                        <p className="mt-1 text-sm font-medium">{e.email.subject}</p>
                      </div>
                    ) : (
                      <p className="pt-1.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{name}</span> {summarizeVersion(e.version)} ·{" "}
                        {formatDateTime(e.creation)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
            </SectionCard>
    </div>
  );
}

/**
 * Single panel that combines Assign, Attachment, Tags and Share into one card as
 * stacked sections (no tabs) — used in detail pages (e.g. Journal Entry) right
 * below the document's status/totals row. Comments / Activity are kept separate.
 */
export function DocActionsPanel({ doctype, docname }: { doctype: string; docname?: string }) {
  const sections = [
    { key: "assign", label: "Assigned To", content: <AssignedToCard doctype={doctype} docname={docname} inTab /> },
    { key: "attachment", label: "Attachments", content: <AttachmentsCard doctype={doctype} docname={docname} inTab /> },
    { key: "tags", label: "Tags", content: <TagsCard doctype={doctype} docname={docname} inTab /> },
    { key: "share", label: "Shared With", content: <SharedWithCard doctype={doctype} docname={docname} inTab /> },
  ];

  return (
    <Card className="grid grid-cols-1 divide-y divide-border overflow-hidden">
      {sections.map((s) => (
        <div key={s.key} className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-4 w-1 rounded-full bg-primary" />
            {s.label}
          </h3>
          {s.content}
        </div>
      ))}
    </Card>
  );
}

