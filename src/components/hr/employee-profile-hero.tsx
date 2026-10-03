import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, Cake, CalendarCheck, GitBranch, Mail, Phone, Trash2, UserRound, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { EmployeePhoto } from "@/components/hr/employee-photo";
import { useAggregate, useDocList, count, sum } from "@/hooks/useDoc";
import { formatDate, startOfMonthISO, todayISO } from "@/utils/dates";
import { formatMoney } from "@/utils/currency";
import { asNumber } from "@/utils/cn";

/** Whole years + months between an ISO date and today, e.g. "3 y 4 m". */
export function tenure(from?: string): string {
  if (!from) return "—";
  const a = new Date(from);
  const b = new Date();
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  if (months < 0) return "—";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y ? `${y} y ${m} m` : `${m} m`;
}

function age(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a -= 1;
  return a;
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <span className="shrink-0 text-muted-foreground/70">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums">{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Header card of the employee page: photo (click to change), name, role, contact, and a strip of live
 * figures — tenure, age, this month's attendance, leave taken this year and the latest net pay.
 */
export function EmployeeProfileHero({
  doc,
  displayName,
  onPhotoChange,
}: {
  doc: Record<string, any>;
  displayName: string;
  onPhotoChange: (url: string) => Promise<void>;
}) {
  const emp = doc.name as string;
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const monthFilters = useMemo(
    () => [["employee", "=", emp], ["docstatus", "=", 1], ["attendance_date", ">=", startOfMonthISO()], ["attendance_date", "<=", todayISO()]],
    [emp],
  );
  const { data: att } = useAggregate("Attendance", { fields: ["status", count("name", "n")], filters: monthFilters, groupBy: "status" });
  const { data: leaves } = useAggregate("Leave Application", {
    fields: [sum("total_leave_days", "days")],
    filters: [["employee", "=", emp], ["docstatus", "=", 1], ["from_date", ">=", yearStart]],
  });
  const { data: slip } = useDocList("Salary Slip", {
    fields: ["name", "net_pay", "currency", "end_date"],
    filters: [["employee", "=", emp], ["docstatus", "=", 1]],
    orderBy: { field: "end_date", order: "desc" },
    limit: 1,
  });

  const attBy: Record<string, number> = Object.fromEntries((att ?? []).map((r) => [r.status, asNumber(r.n)]));
  const present = (attBy["Present"] ?? 0) + (attBy["Work From Home"] ?? 0) + (attBy["Half Day"] ?? 0) / 2;
  const marked = Object.values(attBy).reduce((a, b) => a + b, 0);
  const last = slip?.[0];
  const years = age(doc.date_of_birth);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/25 via-sky-500/15 to-violet-500/20" />
      <div className="relative flex flex-col gap-5 p-5 pt-8 lg:flex-row lg:items-end">
        <div className="flex items-end gap-4">
          <div className="relative">
            <EmployeePhoto name={displayName} src={doc.image} docname={emp} size="xl" onChange={onPhotoChange} />
            {doc.image && (
              <button
                type="button"
                onClick={() => void onPhotoChange("")}
                title="Remove photo"
                className="absolute -right-1 bottom-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">{displayName}</h2>
              <StatusBadge status={doc.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {doc.designation || "No designation"} · <span className="font-mono text-xs">{emp}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Hover the photo to upload or change it</p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2 lg:pb-1">
          {doc.department && <Fact icon={<Building2 className="h-3.5 w-3.5" />}>{doc.department}</Fact>}
          {doc.branch && <Fact icon={<GitBranch className="h-3.5 w-3.5" />}>{doc.branch}</Fact>}
          {doc.cell_number && (
            <Fact icon={<Phone className="h-3.5 w-3.5" />}>
              <a href={`tel:${doc.cell_number}`} className="hover:text-foreground hover:underline">{doc.cell_number}</a>
            </Fact>
          )}
          {(doc.company_email || doc.personal_email) && (
            <Fact icon={<Mail className="h-3.5 w-3.5" />}>
              <a href={`mailto:${doc.company_email || doc.personal_email}`} className="hover:text-foreground hover:underline">
                {doc.company_email || doc.personal_email}
              </a>
            </Fact>
          )}
          {doc.reports_to && (
            <Fact icon={<UserRound className="h-3.5 w-3.5" />}>
              Reports to{" "}
              <Link to={`/hr/employees/${encodeURIComponent(doc.reports_to)}`} className="hover:text-foreground hover:underline">
                {doc.reports_to}
              </Link>
            </Fact>
          )}
          {doc.employment_type && <Fact icon={<Briefcase className="h-3.5 w-3.5" />}>{doc.employment_type}</Fact>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border/60 bg-muted/20 p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Tenure" value={tenure(doc.date_of_joining)} hint={`Joined ${formatDate(doc.date_of_joining)}`} />
        <Metric
          label="Age"
          value={years !== null ? `${years} y` : "—"}
          hint={doc.date_of_birth ? <span className="inline-flex items-center gap-1"><Cake className="h-3 w-3" /> {formatDate(doc.date_of_birth, { day: "numeric", month: "short", year: undefined })}</span> : undefined}
        />
        <Metric
          label="Attendance (month)"
          value={marked ? `${Math.round((present / marked) * 100)} %` : "—"}
          hint={<span className="inline-flex items-center gap-1"><CalendarCheck className="h-3 w-3" /> {present} of {marked} days present</span>}
        />
        <Metric label="Leave taken (year)" value={`${asNumber(leaves?.[0]?.days)} d`} hint="Approved applications" />
        <Metric
          label="Last net pay"
          value={last ? formatMoney(asNumber(last.net_pay), last.currency) : "—"}
          hint={
            last ? (
              <Link to={`/payroll/salary-slips/${encodeURIComponent(last.name)}`} className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                <Wallet className="h-3 w-3" /> {formatDate(last.end_date)}
              </Link>
            ) : (
              "No salary slip yet"
            )
          }
        />
      </div>
    </Card>
  );
}
