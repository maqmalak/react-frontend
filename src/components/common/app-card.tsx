import { useRef, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import type { AppTile } from "@/app/apps";

/**
 * Hoverable app-launcher card used on the post-login Desktop grid.
 *
 * Beyond the lift/glow, two extra touches make it feel alive:
 * - a cursor-tracking radial spotlight (position set directly on the DOM
 *   node via a ref on `mousemove`, not React state, so it doesn't re-render
 *   on every pixel of mouse movement)
 * - a one-shot diagonal sheen that sweeps across on hover-in (CSS animation
 *   re-triggered each time via `group-hover:animate-card-sheen`)
 */
export function AppCard({ app }: { app: AppTile }) {
  const Icon = app.icon;
  const spotRef = useRef<HTMLSpanElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (spotRef.current) {
      spotRef.current.style.background = `radial-gradient(140px circle at ${x}% ${y}%, hsl(var(--primary) / 0.22), transparent 72%)`;
    }
  };

  return (
    <Link
      to={app.to}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 will-change-transform",
        "shadow-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-1.5 hover:scale-[1.015] hover:border-primary/40 hover:shadow-xl",
        "dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl dark:shadow-[0_18px_60px_rgb(2_6_23_/_0.4)]",
        "dark:hover:border-primary/50 dark:hover:shadow-[0_0_0_4px_rgb(20_184_166_/_0.32),0_24px_70px_rgb(2_6_23_/_0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {/* Cursor-tracking spotlight */}
      <span
        ref={spotRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* One-shot diagonal sheen sweep */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl">
        <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:animate-card-sheen group-hover:opacity-100 dark:via-white/20" />
      </span>

      <div className="relative z-10 flex items-start justify-between">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-300 ease-out",
            "group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-[0_0_18px_2px_hsl(var(--primary)/0.35)]",
            app.colorClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 -translate-x-2 text-muted-foreground opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:text-primary group-hover:opacity-100" />
      </div>
      <div className="relative z-10">
        <h3 className="text-sm font-semibold tracking-tight transition-colors duration-200 group-hover:text-primary">
          {app.label}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{app.description}</p>
      </div>
    </Link>
  );
}
