import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, Menu, Search, Settings as SettingsIcon, User as UserIcon, UserCircle } from "lucide-react";
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

function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
      <Link to="/" className="transition-colors hover:text-foreground">
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

function NotificationsBell() {
  // Open ToDos assigned to the user act as the notification feed (created by
  // the apparel LC alert scheduler).
  const { currentUser } = useAuth();
  const { data: count } = useFrappeGetDocCount(
    "ToDo",
    [
      ["status", "=", "Open"],
      ["owner", "=", currentUser ?? ""],
    ],
    false,
    currentUser ? `apparel.todo.count.${currentUser}` : null,
  );

  return (
    <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" title="Alerts">
      <Bell className="h-5 w-5" />
      {Number(count) > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {Number(count) > 99 ? "99+" : count}
        </span>
      )}
    </Button>
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

      {brand && <Logo className="h-12 w-auto shrink-0" />}
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Global search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex h-8 items-center gap-2 rounded-md border border-input bg-transparent px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent sm:w-56"
          aria-label="Open global search"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 text-left sm:inline">Search…</span>
          <kbd className="hidden rounded border border-border px-1 py-0.5 font-mono text-[10px] sm:inline">
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