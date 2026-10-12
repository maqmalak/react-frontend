import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";

/** Chart / panel card used on dashboards: rounded, soft shadow, a thin accent line and a clear header. */
export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden rounded-2xl border-border/90 shadow-sm transition-shadow hover:shadow-md", className)}>
      <div className="h-[3px] bg-gradient-to-r from-primary/70 via-sky-400/60 to-emerald-400/60" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 px-5 pb-1 pt-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}
