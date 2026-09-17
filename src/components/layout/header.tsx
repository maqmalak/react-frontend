import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, Menu, Search, Settings as SettingsIcon, User as UserIcon, UserCircle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-provider";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { titleForSegment } from "@/app/navigation";
import { useFrappeGetDocCount } from "frappe-react-sdk";
import { useCrmNotifications, type CrmNotificationDoc } from "@/hooks/useCrmNotifications";
import { formatDateTime } from "@/utils/dates";
import { cn } from "@/utils/cn";

function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
      <Link to="/home" className="transition-colors hover:text-foreground">
        Home
      </Link>
      {segments.map((seg, i) => {
        const to = `/${segments.slice(0, i + 1).join("/")}`;
        const isLast = i === segments.length - 1;
        // Dynamic segments (doc names) may be URL-encoded, e.g. a User's name
        // is its email ("%40" -> "@") — decode before titleForSegment's
        // ROUTE_TITLES lookup / fallback title-casing runs on it.
        const decoded = decodeURIComponent(seg);
        return (
          <span key={to} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="max-w-[16rem] truncate font-medium text-foreground">
                {titleForSegment(decoded)}
              </span>
            ) : (
              <Link to={to} className="transition-colors hover:text-foreground">
                {titleForSegment(decoded)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Where a CRM Notification's `reference_doctype`/`reference_name` actually leads. */
function notificationHref(n: CrmNotificationDoc): string | undefined {
  if (!n.reference_name) return undefined;
  switch (n.reference_doctype) {
    case "CRM Lead":
      return `/crm/leads/${encodeURIComponent(n.reference_name)}`;
    case "CRM Deal":
      return `/crm/deals/${encodeURIComponent(n.reference_name)}`;
    case "CRM Task":
      return `/crm/tasks?open=${encodeURIComponent(n.reference_name)}`;
    case "Event":
      return "/crm/calendar";
    default:
      return undefined;
  }
}

function NotificationsBell() {
  // Open ToDos assigned to the user (created by the micromax LC alert
  // scheduler) plus CRM follow-up/reminder notifications (assignment/mention
  // hooks in the crm app, and our own crm_reminders scheduled job) share one
  // bell — both are "things assigned or due to you" from the user's POV.
  const { currentUser } = useAuth();
  const { data: todoCount } = useFrappeGetDocCount(
    "ToDo",
    [
      ["status", "=", "Open"],
      ["owner", "=", currentUser ?? ""],
    ],
    false,
    currentUser ? `micromax.todo.count.${currentUser}` : null,
    // Poll rather than rely solely on remount/refocus — this header stays
    // mounted across the whole app, so without this the badge would only
    // ever update when the browser tab regains focus.
    { refreshInterval: 30_000 },
  );
  const { notifications, unreadCount, markRead } = useCrmNotifications();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const total = Number(todoCount ?? 0) + unreadCount;

  const openNotification = (n: CrmNotificationDoc) => {
    setOpen(false);
    if (!n.read) void markRead(n.name);
    const href = notificationHref(n);
    if (href) navigate(href);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        title="Alerts"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </Button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-40 mt-1 w-80 animate-fade-in rounded-md border border-border bg-popover shadow-lg",
            "dark:border-white/10 dark:bg-[hsl(216_67%_9%_/_0.97)] dark:shadow-[0_18px_60px_rgb(2_6_23_/_0.55)] dark:backdrop-blur-xl",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reminders</p>
            {unreadCount > 0 && (
              <button
                onClick={() => void markRead()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing due — you're all caught up.</p>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <button
                  key={n.name}
                  onClick={() => openNotification(n)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-accent/50",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="truncate font-medium">{n.notification_text || "Notification"}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(n.creation)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header({
  onOpenSidebar,
  onOpenSearch,
  brand = false,
}: {
  /** Omitted on routes with no sidebar (the Desktop launcher) — hides the toggle. */
  onOpenSidebar?: () => void;
  onOpenSearch: () => void;
  /** Show the logo — used on the Desktop launcher, which has no sidebar to carry it. */
  brand?: boolean;
}) {
  const { user, currentUser, roles, logout } = useAuth();
  const { company, setCompany, companies } = useCompanyContext();
  const navigate = useNavigate();

  const fullName = user?.full_name ?? currentUser ?? "User";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-white/10 dark:bg-white/[0.03] dark:supports-[backdrop-filter]:bg-white/[0.03] sm:px-4">
      {onOpenSidebar && (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {brand && <Logo className="h-8 w-auto shrink-0" />}
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Global search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-accent sm:w-72"
          aria-label="Open global search"
        >
          <Search className="h-5 w-5 shrink-0" />
          <span className="hidden flex-1 text-left sm:inline">Search…</span>
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-xs sm:inline">
            Ctrl K
          </kbd>
        </button>

        {/* Company selector */}
        {companies.length > 0 && (
          <Select
            value={company ?? ""}
            onChange={(e) => setCompany(e.target.value)}
            className="hidden h-8 w-40 text-xs md:block"
            aria-label="Active company"
          >
            {companies.map((c) => (
              <option key={c.name} value={c.name}>
                {c.label}
              </option>
            ))}
          </Select>
        )}

        <NotificationsBell />
        <ThemeToggle />

        <DropdownMenu
          align="end"
          width="w-60"
          trigger={
            <button className="flex items-center gap-2 rounded-md p-0.5 transition-colors hover:bg-accent" aria-label="User menu">
              <Avatar name={fullName} src={user?.user_image} size="sm" />
            </button>
          }
          items={[
            { label: fullName, icon: <UserIcon className="h-4 w-4" />, disabled: true },
            { label: user?.email ?? currentUser ?? "—", disabled: true },
            { separator: true, label: "" },
            { label: `Roles: ${roles.slice(0, 3).join(", ") || "—"}`, disabled: true },
            { label: `Language: ${user?.language ?? "en"}`, disabled: true },
            { label: `Time Zone: ${user?.time_zone ?? "—"}`, disabled: true },
            { label: `Company: ${company ?? "—"}`, disabled: true },
            { separator: true, label: "" },
            { label: "My Account", icon: <UserCircle className="h-4 w-4" />, onClick: () => navigate("/account") },
            { label: "Settings", icon: <SettingsIcon className="h-4 w-4" />, onClick: () => navigate("/settings") },
            { separator: true, label: "" },
            { label: "Sign out", icon: <LogOut className="h-4 w-4" />, destructive: true, onClick: () => void logout() },
          ]}
        />
      </div>
    </header>
  );
}

export { Badge };