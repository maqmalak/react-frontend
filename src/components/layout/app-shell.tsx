import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { GlobalSearch, useGlobalSearchShortcut } from "./global-search";
import { RealtimeWatcher } from "./realtime-watcher";
import { APP_NAVIGATION, APP_LABELS, appSegmentForPath } from "@/app/navigation";

/**
 * Authenticated application shell: header + routed content, with a sidebar
 * scoped to whichever app the current route belongs to.
 *
 * On the Desktop launcher (`/home`) the sidebar lists every app, grouped like the
 * launcher cards; inside an app it shows just that app's own nav.
 */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearchShortcut();
  const location = useLocation();

  const segment = appSegmentForPath(location.pathname);
  const groups = APP_NAVIGATION[segment];
  const showSidebar = Boolean(groups && groups.length > 0);

  return (
    <div className="flex h-full min-h-screen bg-background dark:bg-transparent">
      {showSidebar && (
        <Sidebar
          groups={groups!}
          appLabel={APP_LABELS[segment]}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onOpenSidebar={showSidebar ? () => setMobileOpen(true) : undefined}
          onOpenSearch={() => setSearchOpen(true)}
          brand={!showSidebar}
        />
        <main className="flex-1 overflow-x-clip px-3 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <RealtimeWatcher />
    </div>
  );
}
