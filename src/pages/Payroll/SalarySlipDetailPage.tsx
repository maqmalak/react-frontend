import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Banknote, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalarySlip, useSalarySlipDelete, type SalaryDetailRow } from "@/hooks/usePayroll";
import { notifyDataChanged } from "@/hooks/useRealtime";
import { humanizeError } from "@/services/frappe";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/dates";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value == null || value === "" ? "—" : value}</span>
    </div>
  );
}

function ComponentsTable({ rows, currency }: { rows: SalaryDetailRow[]; currency?: string }) {
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  if (rows.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No components</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Component</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-3">{r.salary_component}</td>
              <td className="py-2 text-right">{formatMoney(r.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-2 pr-3 text-sm font-semibold">Total</td>
            <td className="pt-2 text-right text-sm font-semibold">{formatMoney(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Salary Slip view page — the management-page list uses a generic flat-field
 * dialog for create/edit, which can't render `earnings`/`deductions` (they're
 * child tables). This detail page fetches the full doc so those breakdowns
 * are actually visible; "Edit" deep-links back into that same list dialog
 * (`?open=`, already supported by CrmManagementPage) for the flat fields.
 */
export default function SalarySlipDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: doc, error, isLoading, mutate } = useSalarySlip(name);
  const { deleteDoc, loading: deleteLoading } = useSalarySlipDelete();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!name) return;
    try {
      await deleteDoc(name);
      toast.success("Salary Slip deleted");
      notifyDataChanged();
      navigate("/payroll/salary-slips");
    } catch (err) {
      toast.error(humanizeError(err));
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="space-y-4">
        <PageHeader title="Salary Slip" />
        <SectionCard>
          <p className="text-sm text-destructive">Failed to load salary slip {name}.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void mutate()}>
            Retry
          </Button>
        </SectionCard>
      </div>
    );
  }

  const editable = (doc.docstatus ?? 0) === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={doc.employee_name || doc.employee || doc.name}
        subtitle="Salary Slip"
        icon={<Banknote className="h-5 w-5" />}
        breadcrumbs={
          <Link to="/payroll/salary-slips" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Salary Slips
          </Link>
        }
        actions={
          <>
            <StatusBadge status={doc.status} />
            {editable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/payroll/salary-slips?open=${encodeURIComponent(doc.name)}`)}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={deleteLoading}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge status={doc.status} />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Gross Pay</p>
          <p className="font-bold">{formatMoney(doc.gross_pay, doc.currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Deduction</p>
          <p className="font-bold">{formatMoney(doc.total_deduction, doc.currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Net Pay</p>
          <p className="font-bold">{formatMoney(doc.net_pay, doc.currency)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Slip Details">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Row label="Employee" value={doc.employee_name || doc.employee} />
              <Row label="Company" value={doc.company} />
              <Row label="Department" value={doc.department} />
              <Row label="Designation" value={doc.designation} />
              <Row label="Salary Structure" value={doc.salary_structure} />
              <Row label="Payroll Entry" value={doc.payroll_entry} />
              <Row label="Posting Date" value={formatDate(doc.posting_date)} />
              <Row label="Period" value={`${formatDate(doc.start_date)} – ${formatDate(doc.end_date)}`} />
              <Row label="Payment Days" value={doc.payment_days} />
              <Row label="Absent Days" value={doc.absent_days} />
              <Row label="Leave Without Pay" value={doc.leave_without_pay} />
            </div>
          </SectionCard>

          <SectionCard title="Earnings" description={`${(doc.earnings ?? []).length} component(s)`}>
            <ComponentsTable rows={doc.earnings ?? []} currency={doc.currency} />
          </SectionCard>

          <SectionCard title="Deductions" description={`${(doc.deductions ?? []).length} component(s)`}>
            <ComponentsTable rows={doc.deductions ?? []} currency={doc.currency} />
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this salary slip?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
