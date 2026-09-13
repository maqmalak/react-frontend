import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { Package, Save, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { FrappeForm } from "@/components/forms/frappe-form";
import { EditableChildTable, type ChildRow } from "@/components/tables/child-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionCard } from "@/components/common/section-card";
import { DELIVERY_NOTE_FIELDS, DELIVERY_NOTE_ITEM_COLUMNS } from "@/components/forms/form-configs";
import { useDeliveryNote, useDeliveryNoteMutations } from "@/hooks/useDeliveryNotes";
import { useItems } from "@/hooks/useItems";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/utils/currency";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError, postCall } from "@/services/frappe";
import { todayISO } from "@/utils/dates";
import type { DeliveryNote, DeliveryNoteItem } from "@/types/frappe";

function lineAmount(row: Pick<DeliveryNoteItem, "qty" | "rate">): number {
  return Number(row.qty || 0) * Number(row.rate || 0);
}

export function DeliveryNoteFormPage() {
  const { name } = useParams<{ name?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !name || name === "new";
  const { hasRole } = useAuth();
  const canWrite = hasRole();
  const { company } = useCompanyContext();

  const prefill = (location.state as { prefill?: Partial<DeliveryNote> } | null)?.prefill;

  const { data: doc, error: docError, isLoading: docLoading, mutate } = useDeliveryNote(isNew ? undefined : name);
  const { createDoc, updateDoc, deleteDoc, loading: saving } = useDeliveryNoteMutations();
  const { data: items } = useItems({ enabled: true });
  const { data: customers } = useCustomers({ enabled: true });

  const itemLookup = useMemo(() => {
    const m = new Map<string, { item_name: string; stock_uom?: string; standard_rate?: number }>();
    (items ?? []).forEach((it) =>
      m.set(it.name, { item_name: it.item_name ?? it.name, stock_uom: it.stock_uom, standard_rate: it.standard_rate }),
    );
    return m;
  }, [items]);

  const customerLookup = useMemo(() => {
    const m = new Map<string, string>();
    (customers ?? []).forEach((c) => m.set(c.name, c.customer_name ?? c.name));
    return m;
  }, [customers]);

  const [values, setValues] = useState<Partial<DeliveryNote>>({});
  const [itemRows, setItemRows] = useState<ChildRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = name && !isNew ? `Delivery Note — ${name}` : "Delivery Note";
  }, [name, isNew]);

  useEffect(() => {
    if (doc) {
      setValues(doc);
      setItemRows((doc.items ?? []).map((r) => ({ ...r, __uuid: crypto.randomUUID() })));
    } else if (!docLoading && isNew) {
      if (prefill) {
        setValues(prefill);
        setItemRows((prefill.items ?? []).map((r) => ({ ...r, __uuid: crypto.randomUUID() })));
      } else {
        setValues({
          naming_series: "MAT-DN-.YYYY.-",
          posting_date: todayISO(),
          currency: "USD",
          conversion_rate: 1,
          status: "Draft",
          company: company || undefined,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, docLoading, isNew, company]);

  const onChange = (fieldname: string, value: any) => {
    setValues((v) => {
      const next = { ...v, [fieldname]: value };
      if (fieldname === "customer") next.customer_name = customerLookup.get(value) ?? value;
      return next;
    });
    setErrors((e) => {
      const next = { ...e };
      delete next[fieldname];
      return next;
    });
  };

  const handleItemChange = (index: number, fieldname: string, value: any) => {
    setItemRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const next = { ...r, [fieldname]: value };
        if (fieldname === "qty" || fieldname === "rate") {
          next.amount = lineAmount(next as Pick<DeliveryNoteItem, "qty" | "rate">);
        }
        return next;
      }),
    );
  };

  const handleLinkChange = (index: number, fieldname: string, value: string) => {
    if (fieldname === "item_code") {
      const meta = itemLookup.get(value);
      setItemRows((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          const uom = meta?.stock_uom || r.uom || "Nos";
          const next: ChildRow = {
            ...r,
            item_code: value,
            item_name: meta?.item_name ?? value,
            stock_uom: uom,
            uom,
            conversion_factor: 1,
            rate: r.rate || meta?.standard_rate || 0,
            qty: r.qty || 1,
          };
          next.amount = lineAmount({ qty: Number(next.qty || 0), rate: Number(next.rate || 0) });
          return next;
        }),
      );
    }
  };

  const addItemRow = () =>
    setItemRows((prev) => [
      ...prev,
      { item_code: "", item_name: "", qty: 1, rate: 0, amount: 0, uom: "Nos", stock_uom: "Nos", conversion_factor: 1, __uuid: crypto.randomUUID() },
    ]);

  const removeItemRow = (index: number) => setItemRows((prev) => prev.filter((_, i) => i !== index));
  const duplicateItemRow = (index: number) =>
    setItemRows((prev) => [...prev.slice(0, index + 1), { ...prev[index], __uuid: crypto.randomUUID(), name: undefined }, ...prev.slice(index + 1)]);

  const validate = useCallback((): boolean => {
    const required: [string, string][] = [
      ["customer", "Customer"],
      ["posting_date", "Date"],
      ["company", "Company"],
      ["currency", "Currency"],
    ];
    const next: Record<string, string> = {};
    required.forEach(([f, label]) => {
      if (!(values as Record<string, any>)[f]) next[f] = `${label} is required`;
    });
    if (itemRows.length === 0) next["items"] = "Add at least one line item";
    itemRows.forEach((row, i) => {
      if (!row.item_code) next[`item_${i}`] = `Row ${i + 1}: Item is required`;
      if (!row.qty || Number(row.qty) <= 0) next[`qty_${i}`] = `Row ${i + 1}: Qty must be > 0`;
      if (!row.warehouse) next[`warehouse_${i}`] = `Row ${i + 1}: Warehouse is required`;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values, itemRows]);

  const totals = useMemo(() => {
    const quantity = itemRows.reduce((s, r) => s + Number(r.qty || 0), 0);
    const amount = itemRows.reduce((s, r) => s + Number(r.amount ?? lineAmount(r as any)), 0);
    return { quantity, amount };
  }, [itemRows]);

  const buildPayload = useCallback((): Record<string, unknown> => {
    const conversionRate = Number(values.conversion_rate || 1) || 1;

    const items = itemRows.map(({ __uuid, name: _rowName, owner, creation, modified, modified_by, parent, parentfield, parenttype, docstatus, idx, ...rest }, i) => {
      const qty = Number(rest.qty || 0);
      const rate = Number(rest.rate || 0);
      const amount = qty * rate;
      const uom = rest.uom || rest.stock_uom || "Nos";
      const stockUom = rest.stock_uom || uom;
      const itemName = rest.item_name || rest.item_code || "";
      return {
        doctype: "Delivery Note Item",
        item_code: rest.item_code,
        item_name: itemName,
        description: rest.description || itemName,
        qty,
        uom,
        stock_uom: stockUom,
        conversion_factor: Number(rest.conversion_factor || 1) || 1,
        rate,
        amount,
        base_rate: rate * conversionRate,
        base_amount: amount * conversionRate,
        warehouse: rest.warehouse || values.set_warehouse || undefined,
        cost_center: rest.cost_center || values.cost_center || undefined,
        against_sales_order: rest.against_sales_order || undefined,
        so_detail: rest.so_detail || undefined,
        idx: i + 1,
      };
    });

    return {
      doctype: "Delivery Note",
      naming_series: values.naming_series || "MAT-DN-.YYYY.-",
      customer: values.customer,
      customer_name: values.customer_name || values.customer,
      company: values.company,
      posting_date: values.posting_date || todayISO(),
      // ERPNext forces posting_date/posting_time to right now unless this is
      // set — see erpnext.utilities.transaction_base.TransactionBase.validate_posting_time.
      // Without it, a deliberately backdated (or just non-today) posting_date
      // is silently overwritten server-side.
      set_posting_time: 1,
      currency: values.currency || "USD",
      conversion_rate: conversionRate,
      set_warehouse: values.set_warehouse || undefined,
      cost_center: values.cost_center || undefined,
      tc_name: values.tc_name || undefined,
      instructions: values.instructions || undefined,
      status: values.status || "Draft",
      items,
    };
  }, [values, itemRows]);

  const persist = useCallback(async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted required fields");
      return;
    }
    if (!canWrite) {
      toast.error("You do not have permission to save Delivery Notes");
      return;
    }
    const payload = buildPayload();
    try {
      if (isNew) {
        const created = await createDoc(payload as Partial<DeliveryNote>);
        toast.success(`Delivery Note ${created.name ?? ""} created`);
        notifyDataChanged();
        navigate(created?.name ? `/selling/delivery-notes/${encodeURIComponent(created.name)}` : "/selling/delivery-notes");
      } else {
        const updated = await updateDoc(name!, payload as Partial<DeliveryNote>);
        setValues(updated);
        setItemRows((updated.items ?? []).map((r) => ({ ...r, __uuid: crypto.randomUUID() })));
        toast.success("Delivery Note updated");
        notifyDataChanged();
        void mutate();
      }
    } catch (err) {
      console.error("Delivery Note save failed", err);
      toast.error(humanizeError(err));
    }
  }, [canWrite, validate, buildPayload, isNew, createDoc, updateDoc, name, mutate, navigate]);

  const submitDoc = useCallback(async () => {
    if (!doc?.name || doc.docstatus !== 0) return;
    setSubmitting(true);
    try {
      if (canWrite) await updateDoc(doc.name, buildPayload());
      const full = await postCall<DeliveryNote>("frappe.client.get", { doctype: "Delivery Note", name: doc.name });
      await postCall("frappe.client.submit", { doc: full });
      toast.success("Delivery Note submitted");
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
    if (!name) return;
    try {
      await deleteDoc(name);
      toast.success("Delivery Note deleted");
      notifyDataChanged();
      navigate("/selling/delivery-notes");
    } catch (err) {
      toast.error(humanizeError(err));
      setConfirmDelete(false);
    }
  }, [name, deleteDoc, navigate]);

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
        title="Delivery Note"
        subtitle={isNew ? "New Delivery Note" : name}
        icon={<Package className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => (isNew ? navigate("/selling/delivery-notes") : navigate(-1))} disabled={saving || submitting}>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge status={values.status || (doc?.docstatus === 1 ? "Submitted" : doc?.docstatus === 2 ? "Cancelled" : "Draft")} />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-medium">{values.customer_name || values.customer || <span className="text-muted-foreground"> — </span>}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Currency</p>
          <p className="font-medium">{values.currency || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-bold">{formatMoney(totals.amount, values.currency)}</p>
        </Card>
      </div>

      {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}

      <FrappeForm fields={DELIVERY_NOTE_FIELDS} values={values} errors={errors} readOnly={readOnly} onChange={onChange} />

      <SectionCard title="Items" actions={!readOnly ? <Button size="sm" variant="outline" onClick={addItemRow}>+ Add Row</Button> : undefined}>
        <EditableChildTable
          columns={DELIVERY_NOTE_ITEM_COLUMNS}
          rows={itemRows}
          onChange={handleItemChange}
          onLinkChange={handleLinkChange}
          onRemoveRow={readOnly ? undefined : removeItemRow}
          onDuplicateRow={readOnly ? undefined : duplicateItemRow}
          readOnly={readOnly}
        />
      </SectionCard>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Total Quantity</span>
            <span className="float-right font-medium">{totals.quantity}</span>
          </div>
          <div className="col-span-2">
            <div className="flex justify-between border-t pt-2 md:border-0 md:pt-0">
              <span className="text-muted-foreground">Net Total</span>
              <span className="text-xl font-bold">{formatMoney(totals.amount, values.currency)}</span>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        title="Submit Delivery Note"
        description="Submit this Delivery Note? This decrements stock and cannot be edited afterwards (only cancelled/amended)."
        confirmLabel="Submit"
        loading={submitting}
        onConfirm={() => void submitDoc()}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${doc?.name}?`}
        description="This permanently removes the draft Delivery Note."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
