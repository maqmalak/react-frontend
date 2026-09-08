import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen, Landmark, Save, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionCard } from "@/components/common/section-card";
import { FrappeForm } from "@/components/forms/frappe-form";
import { FrappeLinkField } from "@/components/forms/field-primitives";
import { EditableChildTable, type ChildRow } from "@/components/tables/child-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  JOURNAL_ENTRY_FIELDS,
  JOURNAL_ENTRY_ACCOUNT_COLUMNS,
  JOURNAL_ENTRY_ACCOUNT_EXTRA_FIELDS,
  JOURNAL_ENTRY_EXTRA_FIELDNAMES,
} from "@/components/forms/form-configs";
import { useJournalEntry, useJournalEntryMutations, submitJournalEntry, countPostedGLEntries } from "@/hooks/useAccounting";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/utils/currency";
import { todayISO } from "@/utils/dates";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { getDocument } from "@/services/api";
import { ActivityTimeline, DocActionsPanel } from "@/components/common/activity-panel";
import type { JournalEntry } from "@/types/frappe";

function withUuid<T extends Record<string, any>>(rows: T[]): ChildRow[] {
  return rows.map((r) => ({ ...r, __uuid: crypto.randomUUID() }));
}

function cleanRow(row: ChildRow): Record<string, unknown> {
  const { __uuid, name: _rowName, owner, creation, modified, modified_by, parent, parentfield, parenttype, docstatus, idx, ...rest } = row;
  return rest;
}

/** Create / view / edit a Journal Entry — the core manual double-entry accounting primitive. */
export function JournalEntryFormPage() {
  const { name } = useParams<{ name?: string }>();
  const navigate = useNavigate();
  const isNew = !name || name === "new";
  const { hasRole } = useAuth();
  const canWrite = hasRole();
  const { company, companies } = useCompanyContext();

  const { data: doc, error: docError, isLoading: docLoading, mutate } = useJournalEntry(isNew ? undefined : name);
  const { createDoc, updateDoc, deleteDoc, loading: saving } = useJournalEntryMutations();

  const [values, setValues] = useState<Partial<JournalEntry>>({});
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [showExtraFields, setShowExtraFields] = useState(false);

  useEffect(() => {
    document.title = name && !isNew ? `Journal Entry — ${name}` : "Journal Entry";
  }, [name, isNew]);

  useEffect(() => {
    if (doc) {
      setValues(doc);
      setRows(withUuid(doc.accounts ?? []));
    } else if (!docLoading && isNew) {
      setValues({ voucher_type: "Journal Entry", posting_date: todayISO(), company: company || undefined });
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, docLoading, isNew, company]);

  const applyTemplate = useCallback(async (templateName: string) => {
    if (!templateName) {
      setValues((v) => ({ ...v, from_template: "" }));
      return;
    }
    try {
      const template = await getDocument<Record<string, any>>("Journal Entry Template", templateName);
      setValues((v) => ({
        ...v,
        from_template: templateName,
        voucher_type: template.voucher_type || v.voucher_type,
        company: template.company || v.company,
      }));
      const templateRows = (template.accounts ?? []) as Record<string, any>[];
      setRows(
        withUuid(
          templateRows.map((r) => ({
            account: r.account,
            party_type: r.party_type,
            party: r.party,
            cost_center: r.cost_center,
            debit_in_account_currency: 0,
            credit_in_account_currency: 0,
          })),
        ),
      );
      toast.success(`Loaded ${templateRows.length} row(s) from "${templateName}"`);
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }, []);

  const handleTemplateChange = useCallback(
    (value: string) => {
      const hasMeaningfulRows = rows.some(
        (r) => r.account || r.debit_in_account_currency || r.credit_in_account_currency,
      );
      if (value && hasMeaningfulRows) {
        setPendingTemplate(value);
        return;
      }
      void applyTemplate(value);
    },
    [rows, applyTemplate],
  );

  const onChange = (fieldname: string, value: any) => {
    if (fieldname === "from_template") {
      handleTemplateChange(value);
      return;
    }
    setValues((v) => ({ ...v, [fieldname]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[fieldname];
      return next;
    });
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { account: "", debit_in_account_currency: 0, credit_in_account_currency: 0, __uuid: crypto.randomUUID() },
    ]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  const handleRowChange = (index: number, fieldname: string, value: any) =>
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const next = { ...r, [fieldname]: value };
        if (fieldname === "party_type") next.party = "";
        return next;
      }),
    );

  const totals = useMemo(() => {
    const totalDebit = rows.reduce((s, r) => s + Number(r.debit_in_account_currency || 0), 0);
    const totalCredit = rows.reduce((s, r) => s + Number(r.credit_in_account_currency || 0), 0);
    return { totalDebit, totalCredit, difference: Math.round((totalDebit - totalCredit) * 100) / 100 };
  }, [rows]);

  // The entry's own company currency (not necessarily the globally-selected one) —
  // falls back to a row's account_currency, since a saved doc's `accounts` always
  // carry it even if the Company master list hasn't loaded yet.
  const docCurrency =
    companies.find((c) => c.name === values.company)?.currency ?? (rows[0]?.account_currency as string | undefined);

  const journalEntryFields = useMemo(
    () =>
      JOURNAL_ENTRY_FIELDS.map((f) => {
        if (f.fieldname === "from_template") {
          return {
            ...f,
            filters: [
              ...(values.company ? [["company", "=", values.company]] : []),
              ...(values.voucher_type ? [["voucher_type", "=", values.voucher_type]] : []),
            ],
          };
        }
        if ((JOURNAL_ENTRY_EXTRA_FIELDNAMES as readonly string[]).includes(f.fieldname)) {
          return { ...f, hidden: !showExtraFields };
        }
        return f;
      }),
    [values.company, values.voucher_type, showExtraFields],
  );

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!values.company) next["company"] = "Company is required";
    if (!values.posting_date) next["posting_date"] = "Posting Date is required";
    if (!values.voucher_type) next["voucher_type"] = "Entry Type is required";
    if (rows.length < 2) next["accounts"] = "Add at least two rows (one debit, one credit)";
    rows.forEach((row, i) => {
      if (!row.account) next[`row_${i}`] = `Row ${i + 1}: Account is required`;
      const debit = Number(row.debit_in_account_currency || 0);
      const credit = Number(row.credit_in_account_currency || 0);
      if (debit === 0 && credit === 0) next[`row_amt_${i}`] = `Row ${i + 1}: Enter a debit or credit amount`;
      if (debit !== 0 && credit !== 0) next[`row_both_${i}`] = `Row ${i + 1}: Use either Debit or Credit, not both`;
    });
    if (totals.difference !== 0) next["balance"] = `Debit and Credit must be equal — currently off by ${formatMoney(Math.abs(totals.difference), docCurrency)}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values, rows, totals]);

  const buildPayload = useCallback(
    (): Record<string, unknown> => ({
      doctype: "Journal Entry",
      voucher_type: values.voucher_type || "Journal Entry",
      from_template: values.from_template || undefined,
      company: values.company,
      posting_date: values.posting_date || todayISO(),
      user_remark: values.user_remark,
      accounts: rows.map((r, i) => ({ doctype: "Journal Entry Account", ...cleanRow(r), idx: i + 1 })),
    }),
    [values, rows],
  );

  const persist = useCallback(async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (!canWrite) {
      toast.error("You do not have permission to save Journal Entries");
      return;
    }
    const payload = buildPayload();
    try {
      if (isNew) {
        const created = await createDoc(payload as Partial<JournalEntry>);
        toast.success(`Journal Entry ${created.name ?? ""} created`);
        notifyDataChanged();
        navigate(created?.name ? `/accounting/journal-entries/${encodeURIComponent(created.name)}` : "/accounting/journal-entries");
      } else {
        const updated = await updateDoc(name!, payload as Partial<JournalEntry>);
        setValues(updated);
        setRows(withUuid(updated.accounts ?? []));
        toast.success("Journal Entry updated");
        notifyDataChanged();
        void mutate();
      }
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }, [canWrite, validate, buildPayload, isNew, createDoc, updateDoc, name, mutate, navigate]);

  const submitDoc = useCallback(async () => {
    if (!doc?.name || doc.docstatus !== 0) return;
    setSubmitting(true);
    try {
      if (canWrite) await updateDoc(doc.name, buildPayload());
      await submitJournalEntry(doc.name);
      const glCount = await countPostedGLEntries("Journal Entry", doc.name).catch(() => null);
      toast.success(
        glCount != null
          ? `Journal Entry submitted — ${glCount} GL Entries posted`
          : "Journal Entry submitted — GL entries have been posted",
      );
      notifyDataChanged();
      void mutate();
      setConfirmSubmit(false);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setSubmitting(false);
    }
  }, [doc, canWrite, updateDoc, buildPayload, mutate]);

  const handleDelete = useCallback(async () => {
    if (!doc?.name) return;
    try {
      await deleteDoc(doc.name);
      toast.success("Deleted");
      notifyDataChanged();
      navigate("/accounting/journal-entries");
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setConfirmDelete(false);
    }
  }, [doc?.name, deleteDoc, navigate]);

  const readOnly = !canWrite || (doc?.docstatus !== undefined && doc.docstatus > 0);

  if (!isNew && docLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-72 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }
  if (docError) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{humanizeError(docError)}</p>
        <Button className="mt-3" onClick={() => void mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entry"
        subtitle={isNew ? "New Journal Entry" : name}
        icon={<Landmark className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => (isNew ? navigate("/accounting/journal-entries") : navigate(-1))} disabled={saving || submitting}>
              Cancel
            </Button>
            {!isNew && doc?.docstatus === 0 && (
              <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={saving || !canWrite}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button variant="primary" onClick={() => void persist()} disabled={saving || readOnly || submitting}>
              <Save className="h-4 w-4" />
              {isNew ? "Save" : "Update"}
            </Button>
            {!isNew && doc?.docstatus === 0 && (
              <Button variant="primary" onClick={() => setConfirmSubmit(true)} disabled={saving || !canWrite || submitting}>
                <Send className="h-4 w-4" />
                Submit
              </Button>
            )}
            {!isNew && doc?.docstatus === 1 && (
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    `/accounting/reports/general-ledger?voucher_no=${encodeURIComponent(doc.name!)}&company=${encodeURIComponent(doc.company)}`,
                  )
                }
              >
                <BookOpen className="h-4 w-4" />
                View Ledger
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge status={doc?.docstatus === 1 ? "Submitted" : doc?.docstatus === 2 ? "Cancelled" : "Draft"} />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Debit / Credit</p>
          <p className="font-bold">
            {formatMoney(totals.totalDebit, docCurrency)} / {formatMoney(totals.totalCredit, docCurrency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Difference</p>
          <p className={totals.difference === 0 ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-bold text-destructive"}>
            {formatMoney(totals.difference, docCurrency)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <FrappeForm fields={journalEntryFields} values={values} errors={errors} readOnly={readOnly} onChange={onChange} />
          <Button variant="outline" onClick={() => setShowExtraFields((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" />
            Toggle Extra Fields
          </Button>
        </div>
        <div className="lg:col-span-1">
          <DocActionsPanel doctype="Journal Entry" docname={isNew ? undefined : doc?.name} />
        </div>
      </div>

      {errors.accounts && <p className="text-sm text-destructive">{errors.accounts}</p>}
      {errors.balance && <p className="text-sm text-destructive">{errors.balance}</p>}

      <SectionCard
        title="Accounting Entries"
        description="Every entry must balance — total debit must equal total credit"
        actions={!readOnly ? <Button size="sm" variant="outline" onClick={addRow}>+ Add Row</Button> : undefined}
      >
        <EditableChildTable
          columns={JOURNAL_ENTRY_ACCOUNT_COLUMNS}
          extraDialogColumns={JOURNAL_ENTRY_ACCOUNT_EXTRA_FIELDS}
          rows={rows}
          onChange={handleRowChange}
          onRemoveRow={readOnly ? undefined : removeRow}
          readOnly={readOnly}
          selectable={!readOnly}
          editableInDialog
          columnPicker
          emptyMessage="No rows yet. Add at least one debit and one credit line."
          renderCell={(row, col) => {
            if (col.fieldname !== "party") return undefined;
            const index = rows.indexOf(row);
            if (!row.party_type) return <span className="px-2 text-xs text-muted-foreground">—</span>;
            return (
              <FrappeLinkField
                meta={{ ...col, options: row.party_type as string }}
                value={(row.party as string) ?? ""}
                onChange={(v) => handleRowChange(index, "party", v)}
                disabled={readOnly}
              />
            );
          }}
          totals={[
            { label: "Total Debit", value: formatMoney(totals.totalDebit, docCurrency) },
            { label: "Total Credit", value: formatMoney(totals.totalCredit, docCurrency) },
            { label: "Difference", value: formatMoney(totals.difference, docCurrency), align: "right" },
          ]}
        />
      </SectionCard>

      {/* Comments + Activity live below the child table */}
      <ActivityTimeline doctype="Journal Entry" docname={isNew ? undefined : doc?.name} />

      <ConfirmDialog
        open={!!pendingTemplate}
        title="Replace accounting entries?"
        description="This row data will be replaced with the template's accounts. This cannot be undone."
        confirmLabel="Replace"
        destructive
        onConfirm={() => {
          const t = pendingTemplate!;
          setPendingTemplate(null);
          void applyTemplate(t);
        }}
        onClose={() => setPendingTemplate(null)}
      />
      <ConfirmDialog
        open={confirmSubmit}
        title="Submit Journal Entry"
        description="This posts real GL entries and cannot be edited afterwards. Continue?"
        confirmLabel="Submit"
        loading={submitting}
        onConfirm={() => void submitDoc()}
        onClose={() => setConfirmSubmit(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Journal Entry"
        description="This permanently deletes this draft. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
