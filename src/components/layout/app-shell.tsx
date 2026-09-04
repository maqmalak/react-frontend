import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { GlobalSearch, useGlobalSearchShortcut } from "./global-search";
import { RealtimeWatcher } from "./realtime-watcher";

/** Authenticated application shell: sidebar + header + routed content. */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearchShortcut();

  return (
    <div className="flex h-full min-h-screen bg-background dark:bg-transparent">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenSidebar={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-x-hidden px-3 py-5 sm:px-5 lg:px-6">
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