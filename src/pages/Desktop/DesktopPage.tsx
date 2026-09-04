import { useMemo } from "react";
import { APPS } from "@/app/apps";
import { AppCard } from "@/components/common/app-card";
import { useAuth } from "@/hooks/useAuth";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Post-login landing page — an ERPNext-style app launcher grid. */
export function DesktopPage() {
  const { user, currentUser, hasRole } = useAuth();
  const name = user?.full_name || currentUser || "there";

  const apps = useMemo(
    () => APPS.filter((app) => !app.roles || app.roles.length === 0 || hasRole(...app.roles)),
    [hasRole],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a workspace to get started.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
