import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FileText, Save, Send, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { FrappeForm } from "@/components/forms/frappe-form";
import { EditableChildTable, type ChildRow } from "@/components/tables/child-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionCard } from "@/components/common/section-card";
import {
  LC_PROFORMA_FIELDS,
  LC_PROFORMA_ITEM_COLUMNS,
} from "@/components/forms/form-configs";
import { useLCProforma, useLCProformaMutations } from "@/hooks/useLCProforma";
import { useItems } from "@/hooks/useItems";
import { calculateLCProforma, lcItemAmount } from "@/utils/calculations";
import { formatMoney } from "@/utils/currency";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { createSalesOrderFromLC, humanizeError } from "@/services/frappe";
import { todayISO } from "@/utils/dates";
import type { LCProforma, LCProformaItem } from "@/types/frappe";
import { useAuth } from "@/hooks/useAuth";


const BASE_VALUES: Partial<LCProforma> = {
  proforma_date: todayISO(),
  currency: "USD",
  lc_currency: "USD",
};

/**
 * LC Proforma master-detail page.
 *
 * Renders the ERPNext form engine for header fields + the editable child table
 * for items, with live recalculation of totals. Persists via the SDK's
 * createDoc/updateDoc (cookie/session auth). Actions are gated by roles.
 */
export function LCProformaFormPage() {
  const { name } = useParams<{ name?: string }>();
  const navigate = useNavigate();
  const isNew = !name || name === "new";
    const { hasRole } = useAuth();
  const canWrite = hasRole();

  const { data: doc, error: docError, isLoading: docLoading, mutate } = useLCProforma(isNew ? undefined : name);
  const { createDoc, updateDoc, loading: saving } = useLCProformaMutations();
  const { data: items } = useItems({ enabled: true });

  // Build item name lookup for auto-fill on link selection.
  const itemLookup = useMemo(() => {
    const m = new Map<string, string>();
    (items ?? []).forEach((it) => m.set(it.name, it.item_name ?? it.name));
    return m;
  }, [items]);

  const [values, setValues] = useState<Partial<LCProforma>>({});
  const [itemRows, setItemRows] = useState<ChildRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    document.title = name ? `LC Proforma — ${name}` : "LC Proforma";
  }, [name]);

  useEffect(() => {
    if (doc) {
      setValues(doc);
      setItemRows((doc.lc_proforma_items ?? []).map((r) => ({ ...r, __uuid: crypto.randomUUID() })));
    } else if (!docLoading && isNew) {
      setValues((v) => ({ ...BASE_VALUES, ...v }));
    }
  }, [doc, docLoading, isNew]);

  const onChange = (fieldname: string, value: any) => {
    setValues((v) => ({ ...v, [fieldname]: value }));
    if (fieldname === "currency") {
      setValues((v) => ({ lc_currency: v.lc_currency ?? value, ...v }));
    }
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
                if (fieldname === "quantity" || fieldname === "rate") next.amount = lcItemAmount(next as Pick<LCProformaItem, "quantity" | "rate">);
        return next;
      }),
    );
  };
  const handleLinkChange = (index: number, fieldname: string, value: string) => {
    if (fieldname === "item") {
      const itemName = itemLookup.get(value);
      setItemRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, item_name: itemName ?? value } : r)),
      );
    }
  };
  const addItemRow = () =>
    setItemRows((prev) => [...prev, { item: "", quantity: 0, rate: 0, amount: 0, __uuid: crypto.randomUUID() }]);
  const removeItemRow = (index: number) => setItemRows((prev) => prev.filter((_, i) => i !== index));
  const duplicateItemRow = (index: number) =>
    setItemRows((prev) => [...prev.slice(0, index), { ...prev[index], __uuid: crypto.randomUUID() }, ...prev.slice(index + 1)]);

    
  const validate = (): boolean => {
    const required: [string, string][] = [
      ["proforma_date", "Proforma Date"],
      ["company", "Company"],
      ["customer", "Customer / Buyer"],
      ["currency", "Currency"],
    ];
    const next: Record<string, string> = {};
    required.forEach(([f, label]) => {
      if (!(values as Record<string, any>)[f]) next[f] = `${label} is required`;
    });
    if (itemRows.length === 0) next["items"] = "Add at least one line item";
        setErrors(next);
    return Object.keys(next).length === 0;
  };

  const totals = useMemo(() => calculateLCProforma(itemRows as unknown as LCProformaItem[]), [itemRows]);

  const persist = useCallback(
    async (_isSubmit = false) => {
      if (!canWrite || !validate()) {
        if (!validate()) toast.error("Please fix the highlighted required fields");
        return;
      }
      const payload = {
        ...values,
        lc_proforma_items: itemRows.map(({ __uuid, ...rest }) => rest),
      } as unknown as Partial<LCProforma>;
      try {
        if (isNew) {
          await createDoc(payload);
          toast.success("Created");
        } else {
          const updated = await updateDoc(name!, payload);
          setValues(updated);
          setItemRows(((updated as LCProforma).lc_proforma_items ?? []).map((r) => ({ ...r, __uuid: crypto.randomUUID() })));
          toast.success("Updated");
        }
        notifyDataChanged();
        void mutate();
        setConfirmSubmit(false);
        if (isNew) navigate("/export/lc-proforma");
      } catch (err) {
        toast.error(humanizeError(err));
        setConfirmSubmit(false);
      }
    },
    [canWrite, values, itemRows, isNew, name, createDoc, updateDoc, mutate, navigate],
  );

  const makeSalesOrder = useCallback(async () => {
    if (!doc?.name) return;
    try {
      const soName = await createSalesOrderFromLC(doc.name);
      toast.success(`Sales Order created: ${soName}`);
      notifyDataChanged();
      void mutate();
      window.open(`/app/sales-order/${encodeURIComponent(soName as string)}`, "_blank");
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }, [doc?.name, mutate]);

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
          title="LC Proforma"
          subtitle={isNew ? "New Proforma" : name}
          icon={<FileText className="h-5 w-5" />}
          actions={
            <>
              {doc?.name && (
                <Button variant="outline" onClick={makeSalesOrder} disabled={!canWrite || saving}>
                  <ShoppingCart className="h-4 w-4" />
                  Create Sales Order
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => (isNew ? navigate("/export/lc-proforma") : navigate(-1))}
                disabled={saving}
              >
                Cancel
              </Button>
                            <Button onClick={() => persist(false)} disabled={saving || !canWrite}><Save className="h-4 w-4" />{isNew ? "Save" : "Update"}</Button>
                            {!isNew && doc?.docstatus === 0 && (
                <Button variant="default" onClick={() => setConfirmSubmit(true)} disabled={saving || !canWrite}>
                  <Send className="h-4 w-4" />
                  Submit
                </Button>
              )}
                        </>
          }
        />

        {/* Header Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <StatusBadge
              status={doc?.docstatus === 1 ? "submitted" : doc?.docstatus === 2 ? "cancelled" : "draft"}
            />
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Buyer</p>
            <p className="font-medium">
              {values.customer || <span className="text-muted-foreground"> — </span>}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="font-medium">{values.currency || "—"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-bold">{formatMoney(totals.totals.value, values.currency)}</p>
                    </Card>
        </div>

                {/* Form Sections (rendered from DocType metadata via form engine) */}
        <FrappeForm
          fields={LC_PROFORMA_FIELDS}
          values={values}
          errors={errors}
          readOnly={!canWrite}
          onChange={onChange}
        />


        {/* Items / Child Table */}
        <SectionCard
          title="Items"
          actions={
            <Button size="sm" variant="outline" onClick={addItemRow} disabled={!canWrite}>
              + Add Row
            </Button>
          }
        >
                  <EditableChildTable
            columns={LC_PROFORMA_ITEM_COLUMNS}
            rows={itemRows}
            onChange={handleItemChange}
            onLinkChange={handleLinkChange}
            onRemoveRow={removeItemRow}
            onDuplicateRow={duplicateItemRow}
          />
        </SectionCard>

        {/* Totals Sticky */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Total Quantity</span>
              <span className="float-right font-medium">{totals.totals.quantity}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Cartons</span>
              <span className="float-right font-medium">{totals.totals.cartons}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Net Weight</span>
              <span className="float-right font-medium">{totals.totals.netWeight} kg</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Gross Weight</span>
              <span className="float-right font-medium">{totals.totals.grossWeight} kg</span>
            </div>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proforma Value</span>
              <span className="text-xl font-bold">{formatMoney(totals.totals.value, values.currency)}</span>
            </div>
          </div>
        </Card>

                {/* Confirmation Dialog for submit */}
        <ConfirmDialog
          open={confirmSubmit}
          onClose={() => setConfirmSubmit(false)}
          title="Submit LC Proforma"
          description="Are you sure you want to submit this LC Proforma? This action cannot be undone."
          confirmLabel="Submit"
          onConfirm={() => {
            void persist(true);
            setConfirmSubmit(false);
          }}
        />
      </div>
    );
}

