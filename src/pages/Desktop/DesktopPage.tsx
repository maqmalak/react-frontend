import { useMemo } from "react";
import { APPS, APP_GROUPS } from "@/app/apps";
import { AppCard } from "@/components/common/app-card";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/hooks/useAuth";
import { useVisibleModules, useModuleDocTypes } from "@/hooks/useWorkspaces";
import { useInstalledApps } from "@/hooks/useInstalledApps";
import { APP_TIME_ZONE } from "@/utils/dates";

/** How many real doctypes to surface as "features" under each card's title. */
const FEATURES_PER_APP = 4;

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(
      new Date(),
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Post-login landing page — an ERPNext-style app launcher grid. */
export function DesktopPage() {
  const { user, currentUser, hasRole } = useAuth();
  const name = user?.full_name || currentUser || "there";

  // Real, live module visibility from ERPNext's own Workspace records — a
  // tile whose `module` isn't actually enabled/visible on this site is
  // hidden rather than linking to functionality that isn't there. While the
  // real list is still loading, every tile stays visible (no flash of a
  // half-populated grid); modules without a mapped `module` field (core app
  // pages, or ones spanning several ERPNext modules) are never gated.
  const { modules: visibleModules, isLoading: modulesLoading } = useVisibleModules();
  // Tiles whose backend app isn't installed on this site (e.g. Production without micromax) are hidden too.
  const { isAvailable } = useInstalledApps();

  const apps = useMemo(
    () =>
      APPS.filter((app) => {
        if (app.roles && app.roles.length > 0 && !hasRole(...app.roles)) return false;
        if (!isAvailable(app)) return false;
        if (!app.module || modulesLoading) return true;
        return app.module.some((m) => visibleModules.has(m));
      }),
    [hasRole, isAvailable, modulesLoading, visibleModules],
  );

  // One shared query for every card's "features" list — real doctype names
  // for whichever ERPNext module(s) a tile maps to, not hardcoded copy.
  const allModules = useMemo(
    () => [...new Set(apps.flatMap((app) => app.module ?? []))],
    [apps],
  );
  const { byModule } = useModuleDocTypes(allModules);
  const featuresFor = (app: (typeof APPS)[number]) => {
    // Curated bullets (copied from the public website's module catalogue)
    // take priority — real doctype names are accurate but not necessarily
    // the module's most meaningful ones (e.g. Accounting's first few
    // doctypes alphabetically are setup tables, not Journal Entry).
    if (app.features) return app.features;
    if (!app.module) return undefined;
    const names = app.module.flatMap((m) => byModule.get(m) ?? []);
    return names.length > 0 ? [...new Set(names)].slice(0, FEATURES_PER_APP) : undefined;
  };

  // Sections in APP_GROUPS order; tiles keep their APPS order inside each section.
  const sections = [...APP_GROUPS, "More"]
    .map((group) => ({ group, items: apps.filter((a) => (a.group ?? "More") === group) }))
    .filter((sec) => sec.items.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Logo variant="mark" className="h-12 w-auto shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a workspace to get started — {apps.length} module{apps.length === 1 ? "" : "s"} available.
          </p>
        </div>
      </div>

      {sections.map(({ group, items }) => (
        <section key={group} className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{items.length}</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((app) => (
              <AppCard key={app.id} app={app} features={featuresFor(app)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
