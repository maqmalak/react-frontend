import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { GlobalSearch, useGlobalSearchShortcut } from "./global-search";
import { RealtimeWatcher } from "./realtime-watcher";
import { APP_NAVIGATION, APP_LABELS, appSegmentForPath } from "@/app/navigation";
import { useInstalledApps, tileForPath, appsForPath } from "@/hooks/useInstalledApps";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/utils/cn";

/**
 * Authenticated application shell: header + routed content, with a sidebar
 * scoped to whichever app the current route belongs to.
 *
 * On the Desktop launcher (`/home`) the sidebar lists every app, grouped like the
 * launcher cards; inside an app it shows just that app's own nav.
 */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop: hide / show the sidebar (remembered per device; Ctrl+B toggles).
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("sidebar.collapsed") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("sidebar.collapsed", collapsed ? "1" : "0"); } catch { /* private mode */ } }, [collapsed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); setCollapsed((c) => !c); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearchShortcut();
  const location = useLocation();

  const navigate = useNavigate();
  const { hasApps, isPathAvailable, isLoading: appsLoading, error: appsError } = useInstalledApps();

  const segment = appSegmentForPath(location.pathname);
  // Drop sidebar links whose page needs a backend app this site doesn't have (e.g. Export Analysis without
  // micromax) — in every app's sidebar, including the home one that lists the app tiles.
  const groups = useMemo(() => {
    const nav = APP_NAVIGATION[segment];
    if (!nav) return nav;
    return nav
      .map((group) => ({ ...group, items: group.items.filter((item) => isPathAvailable(item.to)) }))
      .filter((group) => group.items.length > 0);
  }, [segment, isPathAvailable]);
  const showSidebar = Boolean(groups && groups.length > 0);

  // A route that needs an app this site doesn't have (e.g. /production on the school site) shows a notice
  // instead of pages that would only fail; while the app list loads, such a route renders nothing.
  const tile = tileForPath(location.pathname);
  const requiredApps = appsForPath(location.pathname);
  const gated = requiredApps.length > 0 && !appsError;
  const unavailable = gated && !appsLoading && !hasApps(requiredApps);

  return (
    // No fixed height here: the box must grow with the page, or the sticky sidebar (sticky within this box)
    // scrolls away once the content passes one screen.
    <div className="flex min-h-screen bg-background dark:bg-transparent">
      {showSidebar && (
        <Sidebar
          groups={groups!}
          appLabel={APP_LABELS[segment]}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          collapsed={collapsed}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onOpenSidebar={showSidebar ? () => setMobileOpen(true) : undefined}
          sidebarCollapsed={collapsed}
          onToggleSidebar={showSidebar ? () => setCollapsed((c) => !c) : undefined}
          onOpenSearch={() => setSearchOpen(true)}
          brand={!showSidebar}
        />
        <main className="flex-1 overflow-x-clip px-3 py-5 sm:px-5 lg:px-6">
          {/* sidebar hidden → use the whole screen (the POS terminal gets more item columns) */}
          <div className={cn("mx-auto w-full transition-[max-width] duration-300", collapsed && showSidebar ? "max-w-[2400px]" : "max-w-[1400px]")}>
            {unavailable ? (
              <EmptyState
                icon={tile?.icon}
                title={`${tile && tile.apps?.join() === requiredApps.join() ? tile.label : "This page"} isn't available on this site`}
                description={`It needs the ${requiredApps.join(", ")} app, which isn't installed here.`}
                actionLabel="Back to apps"
                onAction={() => navigate("/home")}
              />
            ) : gated && appsLoading ? null : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <RealtimeWatcher />
    </div>
  );
}
