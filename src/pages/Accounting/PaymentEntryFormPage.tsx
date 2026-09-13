import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Banknote, BookOpen, ListChecks, Save, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionCard } from "@/components/common/section-card";
import { FrappeForm } from "@/components/forms/frappe-form";
import { FrappeLinkField, type FormFieldMeta } from "@/components/forms/field-primitives";
import { EditableChildTable, type ChildRow } from "@/components/tables/child-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  PAYMENT_ENTRY_FIELDS,
  PAYMENT_ENTRY_REFERENCE_COLUMNS,
  PAYMENT_ENTRY_DEDUCTION_COLUMNS,
} from "@/components/forms/form-configs";
import {
  usePaymentEntry,
  usePaymentEntryMutations,
  submitPaymentEntry,
  getPartyPaymentDetails,
  getAccountPaymentDetails,
  getOutstandingReferenceDocuments,
} from "@/hooks/usePaymentEntries";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/utils/currency";
import { todayISO } from "@/utils/dates";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { ActivityTimeline, DocActionsPanel } from "@/components/common/activity-panel";
import type { PaymentEntry } from "@/types/frappe";

function withUuid<T extends Record<string, any>>(rows: T[]): ChildRow[] {
  return rows.map((r) => ({ ...r, __uuid: crypto.randomUUID() }));
}

function cleanRow(row: ChildRow): Record<string, unknown> {
  const { __uuid, name: _rowName, owner, creation, modified, modified_by, parent, parentfield, parenttype, docstatus, idx, ...rest } = row;
  return rest;
}

/**
 * The account that carries the party's own outstanding balance — for a
 * Receive entry that's `paid_from` (money conceptually leaves the
 * customer's Receivable account), for a Pay entry it's `paid_to` (the
 * supplier's Payable account). Internal Transfers have no party.
 */
function partyAccountField(paymentType?: string): "paid_from" | "paid_to" {
  return paymentType === "Pay" ? "paid_to" : "paid_from";
}

/** Create / view / edit a Payment Entry — money received from or paid to a party, or moved between accounts. */
export function PaymentEntryFormPage() {
  const { name } = useParams<{ name?: string }>();
  const navigate = useNavigate();
  const isNew = !name || name === "new";
  const { hasRole } = useAuth();
  const canWrite = hasRole();
  const { company } = useCompanyContext();

  const { data: doc, error: docError, isLoading: docLoading, mutate } = usePaymentEntry(isNew ? undefined : name);
  const { createDoc, updateDoc, deleteDoc, loading: saving } = usePaymentEntryMutations();

  const [values, setValues] = useState<Partial<PaymentEntry>>({});
  const [referenceRows, setReferenceRows] = useState<ChildRow[]>([]);
  const [deductionRows, setDeductionRows] = useState<ChildRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingOutstanding, setFetchingOutstanding] = useState(false);

  useEffect(() => {
    document.title = name && !isNew ? `Payment Entry — ${name}` : "Payment Entry";
  }, [name, isNew]);

  useEffect(() => {
    if (doc) {
      setValues(doc);
      setReferenceRows(withUuid(doc.references ?? []));
      setDeductionRows(withUuid(doc.deductions ?? []));
    } else if (!docLoading && isNew) {
      setValues({
        payment_type: "Receive",
        posting_date: todayISO(),
        company: company || undefined,
        party_type: "Customer",
        source_exchange_rate: 1,
        target_exchange_rate: 1,
      });
      setReferenceRows([]);
      setDeductionRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, docLoading, isNew, company]);

  const clearError = (fieldname: string) =>
    setErrors((e) => {
      if (!(fieldname in e)) return e;
      const next = { ...e };
      delete next[fieldname];
      return next;
    });

  const handlePaymentTypeChange = (value: string) => {
    setReferenceRows([]);
    setValues((v) => ({
      ...v,
      payment_type: value,
      party_type: value === "Internal Transfer" ? undefined : value === "Pay" ? "Supplier" : "Customer",
      party: undefined,
      party_name: undefined,
      paid_from: undefined,
      paid_to: undefined,
      paid_from_account_currency: undefined,
      paid_to_account_currency: undefined,
    }));
  };

  const handlePartyTypeChange = (value: string) => {
    setReferenceRows([]);
    setValues((v) => {
      const accountField = partyAccountField(v.payment_type);
      const currencyField = `${accountField}_account_currency` as const;
      return { ...v, party_type: value, party: undefined, party_name: undefined, [accountField]: undefined, [currencyField]: undefined };
    });
  };

  const handlePartyChange = async (value: string) => {
    setReferenceRows([]);
    setValues((v) => ({ ...v, party: value, party_name: undefined }));
    if (!value || !values.party_type || !values.company) return;
    try {
      const details = await getPartyPaymentDetails({
        company: values.company,
        party_type: values.party_type,
        party: value,
        date: values.posting_date || todayISO(),
      });
      const accountField = partyAccountField(values.payment_type);
      const currencyField = `${accountField}_account_currency` as const;
      setValues((v) => ({
        ...v,
        party_name: details.party_name,
        [accountField]: details.party_account,
        [currencyField]: details.party_account_currency,
      }));
    } catch (err) {
      toast.error(humanizeError(err));
    }
  };

  const handleAccountChange = async (which: "paid_from" | "paid_to", value: string) => {
    const currencyField = `${which}_account_currency` as const;
    setValues((v) => ({ ...v, [which]: value }));
    if (!value) return;
    try {
      const details = await getAccountPaymentDetails({ account: value, date: values.posting_date || todayISO() });
      setValues((v) => ({ ...v, [currencyField]: details.account_currency }));
    } catch {
      // Non-fatal — currency just won't auto-fill; the server still validates/derives it on save.
    }
  };

  /** When Paid From/To share one currency, keep Paid/Received Amount mirrored — the common single-currency case. */
  const syncAmount = (v: Partial<PaymentEntry>, field: "paid_amount" | "received_amount", value: number | null): Partial<PaymentEntry> => {
    const next = { ...v, [field]: value };
    const sameCurrency = !v.paid_from_account_currency || !v.paid_to_account_currency || v.paid_from_account_currency === v.paid_to_account_currency;
    if (sameCurrency) {
      const other = field === "paid_amount" ? "received_amount" : "paid_amount";
      (next as any)[other] = value;
    }
    return next;
  };

  const onChange = (fieldname: string, value: any) => {
    clearError(fieldname);
    switch (fieldname) {
      case "payment_type":
        handlePaymentTypeChange(value);
        return;
      case "party_type":
        handlePartyTypeChange(value);
        return;
      case "party":
        void handlePartyChange(value);
        return;
      case "paid_from":
        void handleAccountChange("paid_from", value);
        return;
      case "paid_to":
        void handleAccountChange("paid_to", value);
        return;
      case "paid_amount":
        setValues((v) => syncAmount(v, "paid_amount", value));
        return;
      case "received_amount":
        setValues((v) => syncAmount(v, "received_amount", value));
        return;
      default:
        setValues((v) => ({ ...v, [fieldname]: value }));
    }
  };

  const handleReferenceChange = (index: number, fieldname: string, value: any) =>
    setReferenceRows((prev) => prev.map((r, i) => (i === index ? { ...r, [fieldname]: value } : r)));
  const handleReferenceLinkChange = (index: number, fieldname: string, value: string) => {
    if (fieldname !== "reference_doctype") return;
    setReferenceRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, reference_doctype: value, reference_name: "" } : r)),
    );
  };
  const addReferenceRow = () =>
    setReferenceRows((prev) => [
      ...prev,
      { reference_doctype: "Sales Invoice", reference_name: "", allocated_amount: 0, __uuid: crypto.randomUUID() },
    ]);
  const removeReferenceRow = (index: number) => setReferenceRows((prev) => prev.filter((_, i) => i !== index));

  const handleDeductionChange = (index: number, fieldname: string, value: any) =>
    setDeductionRows((prev) => prev.map((r, i) => (i === index ? { ...r, [fieldname]: value } : r)));
  const addDeductionRow = () =>
    setDeductionRows((prev) => [...prev, { account: "", amount: 0, __uuid: crypto.randomUUID() }]);
  const removeDeductionRow = (index: number) => setDeductionRows((prev) => prev.filter((_, i) => i !== index));

  const canFetchOutstanding =
    values.payment_type !== "Internal Transfer" && !!values.party_type && !!values.party && !!values.company;

  const fetchOutstanding = useCallback(async () => {
    if (!values.company || !values.party_type || !values.party) return;
    const accountField = partyAccountField(values.payment_type);
    const partyAccount = (values as any)[accountField];
    if (!partyAccount) {
      toast.error("Select the party first so its receivable/payable account can be resolved");
      return;
    }
    setFetchingOutstanding(true);
    try {
      const rows = await getOutstandingReferenceDocuments({
        company: values.company,
        party_type: values.party_type,
        party: values.party,
        party_account: partyAccount,
        payment_type: values.payment_type || "Receive",
      });
      const existingKeys = new Set(referenceRows.map((r) => `${r.reference_doctype}::${r.reference_name}`));
      const toAdd = rows.filter((r) => !existingKeys.has(`${r.voucher_type}::${r.voucher_no}`));
      if (toAdd.length === 0) {
        toast("No new outstanding invoices found to add");
        return;
      }
      const alreadyAllocated = referenceRows.reduce((s, r) => s + Number(r.allocated_amount || 0), 0);
      let remaining = Math.max(Number(values.paid_amount || values.received_amount || 0) - alreadyAllocated, 0);
      const newRows: ChildRow[] = toAdd.map((r) => {
        const allocated = remaining > 0 ? Math.min(r.outstanding_amount, remaining) : r.outstanding_amount;
        remaining = Math.max(remaining - allocated, 0);
        return {
          reference_doctype: r.voucher_type,
          reference_name: r.voucher_no,
          due_date: r.due_date,
          bill_no: r.bill_no,
          total_amount: r.invoice_amount,
          outstanding_amount: r.outstanding_amount,
          allocated_amount: Math.round(allocated * 100) / 100,
          exchange_rate: r.exchange_rate ?? 1,
          __uuid: crypto.randomUUID(),
        };
      });
      setReferenceRows((prev) => [...prev, ...newRows]);
      toast.success(`Added ${newRows.length} outstanding ${newRows.length === 1 ? "document" : "documents"}`);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setFetchingOutstanding(false);
    }
  }, [values, referenceRows]);

  const totals = useMemo(() => {
    const totalAllocated = referenceRows.reduce((s, r) => s + Number(r.allocated_amount || 0), 0);
    const totalDeductions = deductionRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const paid = Number(values.paid_amount || 0);
    return {
      totalAllocated,
      totalDeductions,
      unallocated: Math.round((paid - totalAllocated) * 100) / 100,
    };
  }, [referenceRows, deductionRows, values.paid_amount]);

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!values.company) next.company = "Company is required";
    if (!values.posting_date) next.posting_date = "Posting Date is required";
    if (!values.payment_type) next.payment_type = "Payment Type is required";
    if (values.payment_type !== "Internal Transfer") {
      if (!values.party_type) next.party_type = "Party Type is required";
      if (!values.party) next.party = "Party is required";
    }
    if (!values.paid_from) next.paid_from = "Account Paid From is required";
    if (!values.paid_to) next.paid_to = "Account Paid To is required";
    if (!values.paid_amount || Number(values.paid_amount) <= 0) next.paid_amount = "Paid Amount must be greater than 0";
    if (!values.received_amount || Number(values.received_amount) <= 0) next.received_amount = "Received Amount must be greater than 0";
    referenceRows.forEach((row, i) => {
      if (!row.reference_name) next[`ref_${i}`] = `Row ${i + 1}: Reference is required`;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values, referenceRows]);

  const buildPayload = useCallback((): Record<string, unknown> => {
    const isInternal = values.payment_type === "Internal Transfer";
    return {
      doctype: "Payment Entry",
      naming_series: values.naming_series || "ACC-PAY-.YYYY.-",
      payment_type: values.payment_type || "Receive",
      posting_date: values.posting_date || todayISO(),
      company: values.company,
      mode_of_payment: values.mode_of_payment || undefined,
      party_type: isInternal ? undefined : values.party_type,
      party: isInternal ? undefined : values.party,
      party_name: isInternal ? undefined : values.party_name,
      paid_from: values.paid_from,
      paid_from_account_currency: values.paid_from_account_currency || undefined,
      paid_to: values.paid_to,
      paid_to_account_currency: values.paid_to_account_currency || undefined,
      paid_amount: Number(values.paid_amount || 0),
      source_exchange_rate: Number(values.source_exchange_rate || 1) || 1,
      received_amount: Number(values.received_amount || 0),
      target_exchange_rate: Number(values.target_exchange_rate || 1) || 1,
      reference_no: values.reference_no || undefined,
      reference_date: values.reference_date || undefined,
      project: values.project || undefined,
      cost_center: values.cost_center || undefined,
      remarks: values.remarks || undefined,
      references: referenceRows.map((r, i) => ({ doctype: "Payment Entry Reference", ...cleanRow(r), idx: i + 1 })),
      deductions: deductionRows.map((r, i) => ({ doctype: "Payment Entry Deduction", ...cleanRow(r), idx: i + 1 })),
    };
  }, [values, referenceRows, deductionRows]);

  const persist = useCallback(async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (!canWrite) {
      toast.error("You do not have permission to save Payment Entries");
      return;
    }
    const payload = buildPayload();
    try {
      if (isNew) {
        const created = await createDoc(payload as Partial<PaymentEntry>);
        toast.success(`Payment Entry ${created.name ?? ""} created`);
        notifyDataChanged();
        navigate(created?.name ? `/accounting/payment-entries/${encodeURIComponent(created.name)}` : "/accounting/payment-entries");
      } else {
        const updated = await updateDoc(name!, payload as Partial<PaymentEntry>);
        setValues(updated);
        setReferenceRows(withUuid(updated.references ?? []));
        setDeductionRows(withUuid(updated.deductions ?? []));
        toast.success("Payment Entry updated");
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
      await submitPaymentEntry(doc.name);
      toast.success("Payment Entry submitted");
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
      navigate("/accounting/payment-entries");
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setConfirmDelete(false);
    }
  }, [doc?.name, deleteDoc, navigate]);

  const readOnly = !canWrite || (doc?.docstatus !== undefined && doc.docstatus > 0);

  const renderPartyField = (meta: FormFieldMeta) => {
    if (meta.fieldname !== "party") return undefined;
    if (!values.party_type) {
      return <p className="flex h-9 items-center px-3 text-sm text-muted-foreground">Select a party type first</p>;
    }
    return (
      <FrappeLinkField
        meta={{ ...meta, options: values.party_type }}
        value={values.party ?? ""}
        onChange={(v) => onChange("party", v)}
        disabled={readOnly}
      />
    );
  };

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
        title="Payment Entry"
        subtitle={isNew ? "New Payment Entry" : name}
        icon={<Banknote className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => (isNew ? navigate("/accounting/payment-entries") : navigate(-1))} disabled={saving || submitting}>
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
                    `/accounting/reports/general-ledger?voucher_no=${encodeURIComponent(doc.name!)}&company=${encodeURIComponent(doc.company ?? "")}`,
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge status={doc?.docstatus === 1 ? "Submitted" : doc?.docstatus === 2 ? "Cancelled" : "Draft"} />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Payment Type</p>
          <p className="font-medium">{values.payment_type || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Party</p>
          <p className="truncate font-medium">{values.party_name || values.party || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Paid / Received</p>
          <p className="font-bold">
            {formatMoney(values.paid_amount, values.paid_from_account_currency)} / {formatMoney(values.received_amount, values.paid_to_account_currency)}
          </p>
        </Card>
      </div>

      {isNew ? (
        <FrappeForm
          fields={PAYMENT_ENTRY_FIELDS}
          values={values}
          errors={errors}
          readOnly={readOnly}
          onChange={onChange}
          renderField={renderPartyField}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <FrappeForm
              fields={PAYMENT_ENTRY_FIELDS}
              values={values}
              errors={errors}
              readOnly={readOnly}
              onChange={onChange}
              renderField={renderPartyField}
            />
          </div>
          <div className="lg:col-span-1">
            <DocActionsPanel doctype="Payment Entry" docname={doc?.name} />
          </div>
        </div>
      )}

      <SectionCard
        title="References"
        description="Outstanding invoices/orders this payment settles"
        actions={
          !readOnly ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void fetchOutstanding()} disabled={!canFetchOutstanding || fetchingOutstanding}>
                <ListChecks className="h-3.5 w-3.5" />
                {fetchingOutstanding ? "Loading…" : "Get Outstanding Invoices"}
              </Button>
              <Button size="sm" variant="outline" onClick={addReferenceRow}>
                + Add Row
              </Button>
            </div>
          ) : undefined
        }
      >
        <EditableChildTable
          columns={PAYMENT_ENTRY_REFERENCE_COLUMNS}
          rows={referenceRows}
          onChange={handleReferenceChange}
          onLinkChange={handleReferenceLinkChange}
          onRemoveRow={readOnly ? undefined : removeReferenceRow}
          readOnly={readOnly}
          emptyMessage='No references yet. Use "Get Outstanding Invoices" or add a row manually.'
          renderCell={(row, col) => {
            if (col.fieldname !== "reference_name") return undefined;
            const index = referenceRows.indexOf(row);
            if (!row.reference_doctype) return <span className="px-2 text-xs text-muted-foreground">—</span>;
            return (
              <FrappeLinkField
                meta={{ ...col, options: row.reference_doctype as string }}
                value={(row.reference_name as string) ?? ""}
                onChange={(v) => handleReferenceChange(index, "reference_name", v)}
                disabled={readOnly}
              />
            );
          }}
          totals={[
            { label: "Total Allocated", value: formatMoney(totals.totalAllocated, values.paid_from_account_currency) },
            {
              label: "Unallocated",
              value: formatMoney(totals.unallocated, values.paid_from_account_currency),
              align: "right",
            },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Deductions or Loss"
        description="TDS, bank charges, exchange loss, write-offs, etc."
        actions={!readOnly ? <Button size="sm" variant="outline" onClick={addDeductionRow}>+ Add Row</Button> : undefined}
      >
        <EditableChildTable
          columns={PAYMENT_ENTRY_DEDUCTION_COLUMNS}
          rows={deductionRows}
          onChange={handleDeductionChange}
          onRemoveRow={readOnly ? undefined : removeDeductionRow}
          readOnly={readOnly}
          emptyMessage="No deductions."
          totals={[{ label: "Total Deductions", value: formatMoney(totals.totalDeductions), align: "right" }]}
        />
      </SectionCard>

      {/* Comments + Activity live below the child tables — nothing to show until the first save */}
      {!isNew && <ActivityTimeline doctype="Payment Entry" docname={doc?.name} />}

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit Payment Entry"
        description="This posts real GL entries and cannot be edited afterwards. Continue?"
        confirmLabel="Submit"
        loading={submitting}
        onConfirm={() => void submitDoc()}
        onClose={() => setConfirmSubmit(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Payment Entry"
        description="This permanently deletes this draft. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
