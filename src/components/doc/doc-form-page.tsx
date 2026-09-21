import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Ban, Save, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { StatCard } from "@/components/common/stat-card";
import { SectionCard } from "@/components/common/section-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card } from "@/components/ui/card";
import { FrappeForm } from "@/components/forms/frappe-form";
import { EditableChildTable, type ChildRow } from "@/components/tables/child-table";
import { useDocument, useDocMutations, type Doc } from "@/hooks/useDoc";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import type { ChildRows, ChildTableSpec, DocConfig, DocField, DocValues } from "./doc-config";

interface FormState {
  values: DocValues;
  rows: ChildRows;
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));
const newUuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()));

/**
 * Generic create / edit screen for a DocType, driven by a DocConfig.
 *
 *  - header fields via FrappeForm, child tables via EditableChildTable
 *  - `compute` re-runs after every edit (live calculations)
 *  - Save, Submit, Cancel document, Delete — as the document's state allows
 *  - read-only once submitted; child rows round-trip every field so nothing is lost on save
 */
export function DocFormPage({ config }: { config: DocConfig }) {
  const { name: routeName } = useParams<{ name?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !routeName || routeName === "new";
  const { hasRole } = useAuth();
  const canWrite = hasRole();
  const { company } = useCompanyContext();
  const Icon = config.icon;

  const { data: doc, error: docError, isLoading: docLoading, mutate } = useDocument(config.doctype, isNew ? undefined : routeName);
  const { createDoc, updateDoc, deleteDoc, submitDoc, cancelDoc, loading: saving } = useDocMutations(config.doctype);

  const [state, setState] = useState<FormState>({ values: {}, rows: {} });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"submit" | "cancel" | "delete" | null>(null);
  const loadedFor = useRef<string | null>(null);

  const specs = config.children ?? [];

  /** Run the config's live calculation over a state and merge the patches. */
  const withCompute = useCallback(
    (s: FormState): FormState => {
      const out = config.compute?.(s.values, s.rows);
      if (!out) return s;
      return { values: out.values ? { ...s.values, ...out.values } : s.values, rows: out.rows ? { ...s.rows, ...out.rows } : s.rows };
    },
    [config],
  );

  // Load the document (or the defaults for a new one) once per route.
  useEffect(() => {
    const key = isNew ? "new" : routeName ?? "";
    if (isNew) {
      if (loadedFor.current === key) return;
      loadedFor.current = key;
      setState(withCompute({ values: { doctype: config.doctype, ...(config.defaults?.({ company, params: searchParams }) ?? {}) }, rows: Object.fromEntries(specs.map((s) => [s.key, []])) }));
    } else if (doc && loadedFor.current !== `${key}:${doc.modified}`) {
      loadedFor.current = `${key}:${doc.modified}`;
      setState({
        values: doc,
        rows: Object.fromEntries(specs.map((s) => [s.key, ((doc as Doc)[s.key] ?? []).map((r: ChildRow) => ({ ...r, __uuid: newUuid() }))])),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, isNew, routeName]);

  // A new document gets the company as soon as it is known.
  useEffect(() => {
    if (isNew && company) setState((s) => (s.values.company ? s : { ...s, values: { ...s.values, company } }));
  }, [isNew, company]);

  useEffect(() => {
    document.title = isNew ? `New ${config.singular}` : `${config.singular} — ${routeName}`;
  }, [isNew, routeName, config.singular]);

  const { values, rows } = state;
  const docstatus: number | undefined = isNew ? 0 : (doc as Doc | undefined)?.docstatus;
  const readOnly = !canWrite || (config.submittable && (docstatus ?? 0) > 0) || false;

  // ---- editing ---------------------------------------------------------------------------------
  /** Apply a patch: keys naming a child table replace its rows, everything else is a header value. */
  const applyPatch = useCallback(
    (patch: DocValues) =>
      setState((s) => {
        const values = { ...s.values };
        const rows = { ...s.rows };
        Object.entries(patch).forEach(([k, v]) => {
          if (specs.some((sp) => sp.key === k) && Array.isArray(v)) rows[k] = v.map((r: ChildRow) => ({ ...r, __uuid: newUuid() }));
          else values[k] = v;
        });
        return withCompute({ values, rows });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [withCompute],
  );

  const onChange = (fieldname: string, value: any) => {
    setState((s) => withCompute({ ...s, values: { ...s.values, [fieldname]: value } }));
    setErrors((e) => {
      if (!(fieldname in e)) return e;
      const next = { ...e };
      delete next[fieldname];
      return next;
    });
    const effect = config.linkEffects?.[fieldname];
    if (effect) {
      void Promise.resolve(effect(value, { ...values, [fieldname]: value }))
        .then((patch) => patch && applyPatch(patch))
        .catch((err) => console.warn(`${config.doctype}.${fieldname} auto-fill failed`, err));
    }
  };

  const setRows = (key: string, fn: (rows: ChildRow[]) => ChildRow[]) =>
    setState((s) => withCompute({ ...s, rows: { ...s.rows, [key]: fn(s.rows[key] ?? []) } }));

  const onRowChange = (spec: ChildTableSpec) => (index: number, fieldname: string, value: any) =>
    setRows(spec.key, (list) => list.map((r, i) => (i === index ? { ...r, [fieldname]: value } : r)));

  const onRowLinkChange = (spec: ChildTableSpec) => (index: number, fieldname: string, value: string) => {
    const effect = spec.linkEffects?.[fieldname];
    if (!effect) return;
    const row = (rows[spec.key] ?? [])[index];
    void Promise.resolve(effect(value, row ?? {}, values)).then((patch) => {
      if (patch) setRows(spec.key, (list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    });
  };

  const addRow = (spec: ChildTableSpec) =>
    setRows(spec.key, (list) => [...list, { ...(spec.newRow?.(values, list) ?? {}), __uuid: newUuid() }]);
  const removeRow = (spec: ChildTableSpec) => (index: number) => setRows(spec.key, (list) => list.filter((_, i) => i !== index));
  const duplicateRow = (spec: ChildTableSpec) => (index: number) =>
    setRows(spec.key, (list) => [...list.slice(0, index + 1), { ...list[index], __uuid: newUuid(), name: undefined }, ...list.slice(index + 1)]);

  // ---- validation + payload --------------------------------------------------------------------
  const visibleFields: DocField[] = useMemo(() => config.fields.filter((f) => !f.showIf || f.showIf(values)), [config.fields, values]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    visibleFields.forEach((f) => {
      if (f.reqd && !f.read_only && f.fieldtype !== "Section Break" && f.fieldtype !== "Column Break" && isEmpty(values[f.fieldname])) {
        next[f.fieldname] = `${f.label ?? f.fieldname} is required`;
      }
    });
    specs.filter((spec) => !spec.showIf || spec.showIf(values)).forEach((spec) => {
      const list = rows[spec.key] ?? [];
      if ((spec.minRows ?? 0) > list.length) next[`${spec.key}`] = `Add at least ${spec.minRows} row${spec.minRows === 1 ? "" : "s"} to ${spec.label}`;
      list.forEach((row, i) => {
        spec.columns.forEach((col) => {
          if (col.reqd && !col.read_only && col.fieldtype !== "Check" && isEmpty(row[col.fieldname])) {
            next[`${spec.key}_${i}_${col.fieldname}`] = `${spec.label} row ${i + 1}: ${col.label ?? col.fieldname} is required`;
          }
        });
      });
    });
    Object.assign(next, config.validate?.(values, rows) ?? {});
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.values(next)[0];
      toast.error(Object.keys(next).length > 1 ? `${first} (+${Object.keys(next).length - 1} more)` : first);
    }
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): Doc => {
    const payload: Doc = { ...values };
    (config.omitOnSave ?? []).forEach((k) => delete payload[k]);
    specs.forEach((spec) => {
      // Rows keep every field they were loaded with (a save replaces the whole table), minus UI-only keys.
      payload[spec.key] = (rows[spec.key] ?? []).map(({ __uuid, ...rest }, i) => ({ doctype: spec.doctype, ...rest, idx: i + 1 }));
    });
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    return payload;
  };

  // ---- actions ---------------------------------------------------------------------------------
  const save = async (): Promise<string | undefined> => {
    if (!canWrite) {
      toast.error(`You do not have permission to save ${config.plural.toLowerCase()}`);
      return undefined;
    }
    if (!validate()) return undefined;
    try {
      if (isNew) {
        const created = await createDoc(buildPayload());
        toast.success(`${config.singular} ${created.name ?? ""} created`);
        notifyDataChanged();
        navigate(`${config.base}/${encodeURIComponent(String(created.name))}`, { replace: true });
        return String(created.name);
      }
      const updated = await updateDoc(routeName!, buildPayload());
      loadedFor.current = null;
      setState({
        values: updated,
        rows: Object.fromEntries(specs.map((s) => [s.key, ((updated as Doc)[s.key] ?? []).map((r: ChildRow) => ({ ...r, __uuid: newUuid() }))])),
      });
      toast.success(`${config.singular} saved`);
      notifyDataChanged();
      void mutate();
      return routeName;
    } catch (err) {
      toast.error(humanizeError(err));
      return undefined;
    }
  };

  const run = async (kind: "submit" | "cancel" | "delete") => {
    if (!routeName || isNew) return;
    setBusy(true);
    try {
      if (kind === "submit") {
        if (!(await save())) return;
        await submitDoc(routeName);
        toast.success(`${config.singular} submitted`);
      } else if (kind === "cancel") {
        await cancelDoc(routeName);
        toast.success(`${config.singular} cancelled`);
      } else {
        await deleteDoc(routeName);
        toast.success("Deleted");
        notifyDataChanged();
        navigate(config.base);
        return;
      }
      loadedFor.current = null;
      notifyDataChanged();
      void mutate();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  // ---- render ----------------------------------------------------------------------------------
  if (!isNew && docLoading && !doc) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <div className="h-72 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }
  if (docError) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{humanizeError(docError)}</p>
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(config.base)}>
            Back to list
          </Button>
          <Button onClick={() => void mutate()}>Retry</Button>
        </div>
      </div>
    );
  }

  const statusLabel: string | undefined =
    values.status ?? (docstatus === 1 ? "Submitted" : docstatus === 2 ? "Cancelled" : isNew || !config.submittable ? undefined : "Draft");
  const summary = config.summary?.(values, rows) ?? [];
  const title = config.titleOf?.(values) ?? (isNew ? `New ${config.singular}` : routeName ?? config.singular);
  const busyAny = saving || busy;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={isNew ? config.subtitle : config.singular}
        icon={<Icon className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(config.base)} disabled={busyAny}>
              <ArrowLeft className="h-4 w-4" /> {readOnly ? "Back" : "Cancel"}
            </Button>
            {!isNew && canWrite && (!config.submittable || docstatus === 0) && (
              <Button variant="outline" onClick={() => setConfirm("delete")} disabled={busyAny}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            {!readOnly && (
              <Button onClick={() => void save()} disabled={busyAny}>
                <Save className="h-4 w-4" /> {isNew ? "Save" : "Update"}
              </Button>
            )}
            {!isNew && config.submittable && docstatus === 0 && canWrite && (
              <Button variant="default" onClick={() => setConfirm("submit")} disabled={busyAny}>
                <Send className="h-4 w-4" /> Submit
              </Button>
            )}
            {!isNew && config.submittable && docstatus === 1 && canWrite && (
              <Button variant="outline" onClick={() => setConfirm("cancel")} disabled={busyAny}>
                <Ban className="h-4 w-4" /> Cancel document
              </Button>
            )}
          </>
        }
      />

      {(statusLabel || summary.length > 0) && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {statusLabel && (
            <Card className="flex min-w-0 flex-col justify-between gap-2 p-4">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <StatusBadge status={statusLabel} className="w-fit" />
            </Card>
          )}
          {summary.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} tone={s.tone ?? "primary"} icon={<Icon className="h-4 w-4" />} />
          ))}
        </div>
      )}

      <FrappeForm fields={visibleFields} values={values} errors={errors} readOnly={readOnly} onChange={onChange} />

      {specs.filter((spec) => !spec.showIf || spec.showIf(values)).map((spec) => {
        const list = rows[spec.key] ?? [];
        const ro = readOnly || spec.readOnly;
        return (
          <SectionCard
            key={spec.key}
            title={spec.label}
            description={spec.description}
            actions={
              !ro ? (
                <Button size="sm" variant="outline" onClick={() => addRow(spec)}>
                  + Add Row
                </Button>
              ) : undefined
            }
          >
            {errors[spec.key] && <p className="mb-2 text-sm text-destructive">{errors[spec.key]}</p>}
            <EditableChildTable
              columns={spec.columns}
              rows={list}
              onChange={onRowChange(spec)}
              onLinkChange={onRowLinkChange(spec)}
              onRemoveRow={ro ? undefined : removeRow(spec)}
              onDuplicateRow={ro ? undefined : duplicateRow(spec)}
              readOnly={ro}
              totals={spec.totals?.(list)}
              editableInDialog={Boolean(spec.dialogColumns?.length)}
              extraDialogColumns={spec.dialogColumns}
              columnPicker={spec.wide}
              fitColumns
              emptyMessage={ro ? "Nothing here." : "No rows yet. Click Add Row to begin."}
            />
          </SectionCard>
        );
      })}

      {config.extra?.({ name: routeName, isNew, docstatus, readOnly: Boolean(readOnly), values, rows, reload: () => void mutate(), patch: applyPatch })}

      <ConfirmDialog
        open={confirm === "submit"}
        onClose={() => setConfirm(null)}
        title={`Submit ${config.singular}`}
        description={`Submit this ${config.singular.toLowerCase()}? After submit it can no longer be edited (only cancelled).`}
        confirmLabel="Submit"
        loading={busy}
        onConfirm={() => void run("submit")}
      />
      <ConfirmDialog
        open={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        title={`Cancel ${routeName}`}
        description={`Cancel this ${config.singular.toLowerCase()}? Its ledger and stock effects are reversed.`}
        confirmLabel="Cancel document"
        destructive
        loading={busy}
        onConfirm={() => void run("cancel")}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title={`Delete ${routeName}?`}
        description={`This permanently removes the ${config.singular.toLowerCase()}.`}
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={() => void run("delete")}
      />
    </div>
  );
}
