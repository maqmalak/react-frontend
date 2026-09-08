import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

export const STAT_TONES = {
  primary: "bg-primary/10 text-primary",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
} as const;

export interface StatCardProps {
  label: string;
  /** A number, formatted money string, or any React node. */
  value: ReactNode;
  icon: ReactNode;
  tone?: keyof typeof STAT_TONES;
  /** Small muted annotation shown to the right of the value (e.g. "deals"). */
  valueSuffix?: string;
}

/** Compact KPI card used across CRM list pages. */
export function StatCard({ label, value, icon, tone = "primary", valueSuffix }: StatCardProps) {
  return (
    <Card className="flex min-w-0 flex-col justify-between gap-2 p-4">
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", STAT_TONES[tone])}>
          {icon}
        </span>
      </div>
      <p className="flex min-w-0 items-baseline gap-1 text-2xl font-bold leading-none tabular-nums">
        <span className="min-w-0 flex-1 truncate">{value}</span>
        {valueSuffix && <span className="text-xs font-medium text-muted-foreground">{valueSuffix}</span>}
      </p>
    </Card>
  );
}