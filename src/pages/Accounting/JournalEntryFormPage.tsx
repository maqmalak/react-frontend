import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Landmark, Save, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionCard } from "@/components/common/section-card";
import { FrappeForm } from "@/components/forms/frappe-form";
import { FrappeLinkField } from "@/components/forms/field-primitives";
import { EditableChildTable, type ChildRow } from "@/components/tables/child-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { JOURNAL_ENTRY_FIELDS, JOURNAL_ENTRY_ACCOUNT_COLUMNS } from "@/components/forms/form-configs";
import { useJournalEntry, useJournalEntryMutations, submitJournalEntry } from "@/hooks/useAccounting";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/utils/currency";
import { todayISO } from "@/utils/dates";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
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
  const { company } = useCompanyContext();

  const { data: doc, error: docError, isLoading: docLoading, mutate } = useJournalEntry(isNew ? undefined : name);
  const { createDoc, updateDoc, deleteDoc, loading: saving } = useJournalEntryMutations();

  const [values, setValues] = useState<Partial<JournalEntry>>({});
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const onChange = (fieldname: string, value: any) => {
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
    if (totals.difference !== 0) next["balance"] = `Debit and Credit must be equal — currently off by ${formatMoney(Math.abs(totals.difference))}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values, rows, totals]);

  const buildPayload = useCallback(
    (): Record<string, unknown> => ({
      doctype: "Journal Entry",
      voucher_type: values.voucher_type || "Journal Entry",
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
      toast.success("Journal Entry submitted — GL entries have been posted");
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
            <Button onClick={() => void persist()} disabled={saving || readOnly || submitting}>
              <Save className="h-4 w-4" />
              {isNew ? "Save" : "Update"}
            </Button>
            {!isNew && doc?.docstatus === 0 && (
              <Button variant="default" onClick={() => setConfirmSubmit(true)} disabled={saving || !canWrite || submitting}>
                <Send className="h-4 w-4" />
                Submit
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
            {formatMoney(totals.totalDebit)} / {formatMoney(totals.totalCredit)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Difference</p>
          <p className={totals.difference === 0 ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-bold text-destructive"}>
            {formatMoney(totals.difference)}
          </p>
        </Card>
      </div>

      <FrappeForm fields={JOURNAL_ENTRY_FIELDS} values={values} errors={errors} readOnly={readOnly} onChange={onChange} />

      {errors.accounts && <p className="text-sm text-destructive">{errors.accounts}</p>}
      {errors.balance && <p className="text-sm text-destructive">{errors.balance}</p>}
      <SectionCard
        title="Accounting Entries"
        description="Every entry must balance — total debit must equal total credit"
        actions={!readOnly ? <Button size="sm" variant="outline" onClick={addRow}>+ Add Row</Button> : undefined}
      >
        <EditableChildTable
          columns={JOURNAL_ENTRY_ACCOUNT_COLUMNS}
          rows={rows}
          onChange={handleRowChange}
          onRemoveRow={readOnly ? undefined : removeRow}
          readOnly={readOnly}
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
            { label: "Total Debit", value: formatMoney(totals.totalDebit) },
            { label: "Total Credit", value: formatMoney(totals.totalCredit) },
            { label: "Difference", value: formatMoney(totals.difference), align: "right" },
          ]}
        />
      </SectionCard>

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
