import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { FrappeForm } from "@/components/forms/frappe-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CRM_LEAD_FIELDS } from "@/components/forms/form-configs";
import { useCrmLead, useCrmLeadMutations } from "@/hooks/useCrmLeads";
import { useAuth } from "@/hooks/useAuth";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import type { CrmLead } from "@/types/frappe";

export function LeadFormPage() {
  const { name } = useParams<{ name?: string }>();
  const navigate = useNavigate();
  const isNew = !name || name === "new";
  const { hasRole, currentUser } = useAuth();
  const canWrite = hasRole("System Manager", "Sales Manager", "Sales User");

  const { data: doc, error: docError, isLoading: docLoading, mutate } = useCrmLead(isNew ? undefined : name);
  const { createDoc, updateDoc, deleteDoc, loading: saving } = useCrmLeadMutations();

  const [values, setValues] = useState<Partial<CrmLead>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    document.title = name && !isNew ? `Lead — ${name}` : "New Lead";
  }, [name, isNew]);

  useEffect(() => {
    if (doc) {
      setValues(doc);
    } else if (!docLoading && isNew) {
      // "New" is the first stage in this site's CRM Lead Status pipeline
      // (New -> Contacted -> Nurture -> Qualified -> Converted) — just a
      // sensible starting default for the create form, not a hard
      // requirement; the Status field is still a normal editable Link.
      setValues({ status: "New", lead_owner: currentUser ?? undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, docLoading, isNew]);

  const onChange = (fieldname: string, value: any) => {
    setValues((v) => ({ ...v, [fieldname]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[fieldname];
      return next;
    });
  };

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!values.first_name) next.first_name = "First name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values]);

  const persist = useCallback(async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted required fields");
      return;
    }
    if (!canWrite) {
      toast.error("You do not have permission to save Leads");
      return;
    }
    const lead_name = [values.first_name, values.last_name].filter(Boolean).join(" ") || values.first_name;
    const payload: Partial<CrmLead> = { ...values, lead_name };
    try {
      if (isNew) {
        const created = await createDoc(payload);
        toast.success(`Lead ${created.name ?? ""} created`);
        notifyDataChanged();
        navigate(created?.name ? `/crm/leads/${encodeURIComponent(created.name)}` : "/crm/leads");
      } else {
        const updated = await updateDoc(name!, payload);
        setValues(updated);
        toast.success("Lead updated");
        notifyDataChanged();
        void mutate();
      }
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }, [values, validate, canWrite, isNew, createDoc, updateDoc, name, mutate, navigate]);

  const handleDelete = useCallback(async () => {
    if (!doc?.name) return;
    try {
      await deleteDoc(doc.name);
      toast.success("Deleted");
      notifyDataChanged();
      navigate("/crm/leads");
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setConfirmDelete(false);
    }
  }, [doc?.name, deleteDoc, navigate]);

  const readOnly = !canWrite;

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
        title="Lead"
        subtitle={isNew ? "New Lead" : values.lead_name || name}
        icon={<UserPlus className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => (isNew ? navigate("/crm/leads") : navigate(-1))} disabled={saving}>
              Cancel
            </Button>
            {!isNew && (
              <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={saving || !canWrite}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button onClick={() => void persist()} disabled={saving || readOnly}>
              <Save className="h-4 w-4" />
              {isNew ? "Save" : "Update"}
            </Button>
          </>
        }
      />

      {!isNew && (
        <Card className="flex items-center justify-between p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge status={values.status} />
        </Card>
      )}

      <Card className="p-5">
        <FrappeForm fields={CRM_LEAD_FIELDS} values={values} errors={errors} readOnly={readOnly} onChange={onChange} />
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${doc?.name}?`}
        description="This permanently removes the lead."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
