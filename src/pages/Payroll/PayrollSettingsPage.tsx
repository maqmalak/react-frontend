import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Sliders } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { FrappeForm } from "@/components/forms/frappe-form";
import { type FormFieldMeta } from "@/components/forms/field-primitives";
import { usePayrollSettings } from "@/hooks/useSettings";
import { humanizeError } from "@/services/frappe";

const FIELDS: FormFieldMeta[] = [
  { fieldname: "sb_general", label: "General", fieldtype: "Section Break" },
  { fieldname: "payroll_based_on", label: "Payroll Based On", fieldtype: "Select", options: "Leave\nAttendance" },
  { fieldname: "consider_unmarked_attendance_as", label: "Consider Unmarked Attendance As", fieldtype: "Select", options: "Present\nAbsent" },
  { fieldname: "cb_general_1", fieldtype: "Column Break" },
  { fieldname: "daily_wages_fraction_for_half_day", label: "Daily Wages Fraction for Half Day", fieldtype: "Float" },
  { fieldname: "max_working_hours_against_timesheet", label: "Max Working Hours Against Timesheet", fieldtype: "Float" },

  { fieldname: "sb_attendance", label: "Attendance", fieldtype: "Section Break" },
  { fieldname: "include_holidays_in_total_working_days", label: "Include Holidays in Total Working Days", fieldtype: "Check" },
  { fieldname: "cb_attendance_1", fieldtype: "Column Break" },
  { fieldname: "create_overtime_slip", label: "Create Overtime Slip", fieldtype: "Check" },

  { fieldname: "sb_salary_slip", label: "Salary Slip", fieldtype: "Section Break" },
  { fieldname: "email_salary_slip_to_employee", label: "E-Mail Salary Slip to Employee", fieldtype: "Check" },
  { fieldname: "encrypt_salary_slips_in_emails", label: "Encrypt Salary Slips in Emails", fieldtype: "Check" },
  { fieldname: "cb_salary_slip_1", fieldtype: "Column Break" },
  { fieldname: "show_leave_balances_in_salary_slip", label: "Show Leave Balances in Salary Slip", fieldtype: "Check" },
  { fieldname: "process_payroll_accounting_entry_based_on_employee", label: "Process Payroll Accounting Entry Based on Employee", fieldtype: "Check" },
];

/** Payroll Settings — payroll basis, attendance handling, and salary slip emailing. */
export function PayrollSettingsPage() {
  const { data, isLoading, error, mutate, save, saving } = usePayrollSettings();
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data) setValues({ ...data });
  }, [data]);

  const handleSave = async () => {
    try {
      await save(values);
      toast.success("Payroll Settings saved");
    } catch (e) {
      toast.error(humanizeError(e));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Payroll Settings" subtitle="Payroll basis, attendance handling and salary slip emailing" icon={<Sliders className="h-5 w-5" />} />
      <Card className="max-w-3xl">
        <CardContent className="space-y-5 pt-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={() => void mutate()} />
          ) : (
            <>
              <FrappeForm fields={FIELDS} values={values} onChange={(fieldname, value) => setValues((v) => ({ ...v, [fieldname]: value }))} />
              <div className="flex justify-end border-t pt-4">
                <Button onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
