import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import type { AppTile } from "@/app/apps";

/** Hoverable app-launcher card used on the post-login Desktop grid. */
export function AppCard({ app }: { app: AppTile }) {
  const Icon = app.icon;
  return (
    <Link
      to={app.to}
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
        "dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl dark:shadow-[0_18px_60px_rgb(2_6_23_/_0.4)]",
        "dark:hover:border-primary/50 dark:hover:shadow-[0_0_0_4px_rgb(20_184_166_/_0.32),0_18px_60px_rgb(2_6_23_/_0.4)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
            app.colorClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{app.label}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{app.description}</p>
      </div>
    </Link>
  );
}
