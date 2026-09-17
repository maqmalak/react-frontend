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
import { useHRSettings } from "@/hooks/useSettings";
import { humanizeError } from "@/services/frappe";

const FIELDS: FormFieldMeta[] = [
  { fieldname: "sb_general", label: "General", fieldtype: "Section Break" },
  { fieldname: "emp_created_by", label: "Employee Naming By", fieldtype: "Select", options: "Naming Series\nEmployee Number\nFull Name" },
  { fieldname: "retirement_age", label: "Retirement Age (years)", fieldtype: "Data" },
  { fieldname: "cb_general_1", fieldtype: "Column Break" },
  { fieldname: "standard_working_hours", label: "Standard Working Hours", fieldtype: "Float" },

  { fieldname: "sb_approvals", label: "Approvals", fieldtype: "Section Break" },
  { fieldname: "expense_approver_mandatory_in_expense_claim", label: "Expense Approver Mandatory in Expense Claim", fieldtype: "Check" },
  { fieldname: "leave_approver_mandatory_in_leave_application", label: "Leave Approver Mandatory in Leave Application", fieldtype: "Check" },
  { fieldname: "restrict_backdated_leave_application", label: "Restrict Backdated Leave Applications", fieldtype: "Check" },
  { fieldname: "cb_approvals_1", fieldtype: "Column Break" },
  { fieldname: "prevent_self_leave_approval", label: "Prevent Self Leave Approval", fieldtype: "Check" },
  { fieldname: "prevent_self_expense_approval", label: "Prevent Self Expense Approval", fieldtype: "Check" },

  { fieldname: "sb_notifications", label: "Notifications", fieldtype: "Section Break" },
  { fieldname: "send_leave_notification", label: "Send Leave Notification", fieldtype: "Check" },
  { fieldname: "send_holiday_reminders", label: "Send Holiday Reminders", fieldtype: "Check" },
  { fieldname: "cb_notifications_1", fieldtype: "Column Break" },
  { fieldname: "send_birthday_reminders", label: "Send Birthday Reminders", fieldtype: "Check" },
  { fieldname: "send_work_anniversary_reminders", label: "Send Work Anniversary Reminders", fieldtype: "Check" },

  { fieldname: "sb_checkin", label: "Attendance / Check-in", fieldtype: "Section Break" },
  { fieldname: "allow_employee_checkin_from_mobile_app", label: "Allow Employee Check-in from Mobile App", fieldtype: "Check" },
  { fieldname: "allow_geolocation_tracking", label: "Allow Geolocation Tracking", fieldtype: "Check" },
];

/** HR Settings — employee naming, approval rules, and reminder notifications. */
export function HRSettingsPage() {
  const { data, isLoading, error, mutate, save, saving } = useHRSettings();
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data) setValues({ ...data });
  }, [data]);

  const handleSave = async () => {
    try {
      await save(values);
      toast.success("HR Settings saved");
    } catch (e) {
      toast.error(humanizeError(e));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="HR Settings" subtitle="Employee naming, approval rules and reminder notifications" icon={<Sliders className="h-5 w-5" />} />
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
