import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useFrappeGetDoc, useFrappeCreateDoc, useFrappeUpdateDoc, useFrappeDeleteDoc } from "frappe-react-sdk";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionCard } from "@/components/common/section-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FrappeForm } from "@/components/forms/frappe-form";
import { type FormFieldMeta } from "@/components/forms/field-primitives";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";

export interface MasterFormTab {
  id: string;
  label: string;
  fields: FormFieldMeta[];
}

export interface MasterFormPageProps {
  doctype: string;
  /** e.g. "Item" — used for page titles ("New Item") and toasts. */
  labelSingular: string;
  /** List page to return to after Cancel/Delete, e.g. "/masters/items". */
  listPath: string;
  tabs: MasterFormTab[];
  /** Field shown as the page's display title once saved (falls back to the doc name). */
  primaryField: string;
  requiredFields?: string[];
  /** Applied as the starting values when creating a new record. */
  defaults?: Record<string, any>;
  icon?: ReactNode;
}

/**
 * Full-page (not modal) tabbed create/edit view for master doctypes — the
 * Frappe-desk-style document page (Details / Accounting / More Info tabs,
 * one Save action) rather than the compact dialog forms used elsewhere in
 * the app. Reused by Item, Customer, Supplier and their group doctypes.
 */
export function MasterFormPage({ doctype, labelSingular, listPath, tabs, primaryField, requiredFields = [], defaults, icon }: MasterFormPageProps) {
  const params = useParams<{ name?: string }>();
  const navigate = useNavigate();
  const rawName = params.name ? decodeURIComponent(params.name) : undefined;
  const isNew = !rawName || rawName === "new";

  const { data: doc, error, isLoading, mutate } = useFrappeGetDoc<Record<string, any>>(doctype, isNew ? undefined : rawName, isNew ? null : `micromax.master.${doctype}.${rawName}`);
  const { createDoc, loading: creating } = useFrappeCreateDoc();
  const { updateDoc, loading: updating } = useFrappeUpdateDoc();
  const { deleteDoc, loading: deleting } = useFrappeDeleteDoc();
  const saving = creating || updating;

  const [values, setValues] = useState<Record<string, any>>(() => (isNew ? { ...defaults } : {}));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "details");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isNew && doc) setValues({ ...doc });
    if (isNew) setValues({ ...defaults });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, doc]);

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    for (const f of requiredFields) {
      if (values[f] === undefined || values[f] === null || values[f] === "") {
        const meta = tabs.flatMap((t) => t.fields).find((fm) => fm.fieldname === f);
        nextErrors[f] = `${meta?.label ?? f} is required`;
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const tabWithError = tabs.find((t) => t.fields.some((f) => nextErrors[f.fieldname]));
      if (tabWithError) setActiveTab(tabWithError.id);
      return;
    }
    try {
      if (isNew) {
        const created = await createDoc(doctype, values);
        toast.success(`${labelSingular} created`);
        notifyDataChanged();
        navigate(`${listPath}/${encodeURIComponent(created.name)}`, { replace: true });
      } else {
        await updateDoc(doctype, rawName!, values);
        toast.success(`${labelSingular} updated`);
        await mutate();
        notifyDataChanged();
      }
    } catch (e) {
      toast.error(humanizeError(e));
    }
  };

  const handleDelete = async () => {
    if (!rawName) return;
    try {
      await deleteDoc(doctype, rawName);
      toast.success(`${labelSingular} deleted`);
      notifyDataChanged();
      navigate(listPath);
    } catch (e) {
      toast.error(humanizeError(e));
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!isNew && error) {
    return <ErrorState error={error} onRetry={() => void mutate()} />;
  }

  const title = isNew ? `New ${labelSingular}` : values[primaryField] || rawName;

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={doctype}
        icon={icon}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(listPath)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            {!isNew && (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSave} loading={saving}>
              {isNew ? "Create" : "Save Changes"}
            </Button>
          </div>
        }
      />

      {!isNew && "disabled" in values && (
        <div>{values.disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="success">Active</Badge>}</div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <SectionCard>
              <FrappeForm fields={tab.fields} values={values} onChange={(fieldname, value) => setValues((v) => ({ ...v, [fieldname]: value }))} errors={errors} />
            </SectionCard>
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete "${title}"?`}
        description="This action cannot be undone. Records referenced by transactions cannot be deleted."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
