import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Ship,
  Factory,
  Warehouse,
  BarChart3,
  Boxes,
  ShieldCheck,
  ShoppingBag,
  Handshake,
  LifeBuoy,
  Cog,
  Building2,
  Users2,
  Banknote,
  Settings,
  UserCircle,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export interface AppTile {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  to: string;
  /** Curated, dark-mode-safe Tailwind color pair (same convention as ui/badge.tsx). */
  colorClass: string;
  /** Roles allowed to see this tile. Empty = everyone (server still enforces). */
  roles?: string[];
  /** Omit from the pre-login page's module preview (doesn't make sense signed out). */
  hideOnLogin?: boolean;
  /**
   * Real ERPNext module name(s) this tile corresponds to (any one match is
   * enough). When set, the post-login Desktop hides the tile unless a
   * visible, non-hidden Workspace for that module actually exists on this
   * site — so an ERPNext deployment without e.g. Payroll installed won't
   * show a dead Payroll tile. Left undefined for tiles that are core to this
   * app itself or built on doctypes spanning multiple ERPNext modules, which
   * always show.
   */
  module?: string[];
}

/** Desktop app-launcher — one tile per module, shown after login. */
export const APPS: AppTile[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Executive KPIs, charts and trends",
    icon: LayoutDashboard,
    to: "/dashboard",
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "import",
    label: "Import",
    description: "Purchase orders, import shipments, cost sheets",
    icon: ShoppingCart,
    to: "/import/purchase-orders",
    colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "purchase",
    label: "Purchase",
    description: "Receipts, invoices, landed cost vouchers",
    icon: Package,
    to: "/purchase/receipts",
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "export",
    label: "Export",
    description: "LC Proforma, orders, packing, shipments",
    icon: Ship,
    to: "/export/lc-proforma",
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "production",
    label: "Production",
    description: "Work orders and production status",
    icon: Factory,
    to: "/production/work-orders",
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock balances and material movement",
    icon: Warehouse,
    to: "/inventory/stock",
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "reports",
    label: "Reports",
    description: "Import, export, shipment and LC reports",
    icon: BarChart3,
    to: "/reports/import",
    colorClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    id: "masters",
    label: "Masters",
    description: "Items, customers and suppliers",
    icon: Boxes,
    to: "/masters/items",
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    id: "accounting",
    label: "Accounting",
    description: "Chart of accounts, journal entries, ledgers and financial statements",
    icon: Landmark,
    to: "/accounting",
    colorClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    module: ["Accounts"],
  },
  {
    id: "selling",
    label: "Selling",
    description: "Quotations, sales orders and customers",
    icon: ShoppingBag,
    to: "/selling",
    colorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    module: ["Selling"],
  },
  {
    id: "crm",
    label: "CRM",
    description: "Leads, opportunities and customer engagement",
    icon: Handshake,
    to: "/crm",
    colorClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    module: ["CRM", "FCRM"],
  },
  {
    id: "stock",
    label: "Stock",
    description: "Warehouses, stock levels and stock entries",
    icon: Warehouse,
    to: "/inventory/stock",
    colorClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  {
    id: "subcontracting",
    label: "Subcontracting",
    description: "Subcontracting orders and receipts",
    icon: Cog,
    to: "/subcontracting",
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    module: ["Subcontracting", "Manufacturing"],
  },
  {
    id: "assets",
    label: "Assets",
    description: "Fixed asset register, depreciation and maintenance",
    icon: Building2,
    to: "/assets",
    colorClass: "bg-stone-500/10 text-stone-600 dark:text-stone-400",
    module: ["Assets"],
  },
  {
    id: "support",
    label: "Support",
    description: "Issues and customer support tickets",
    icon: LifeBuoy,
    to: "/support",
    colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    module: ["Support", "Helpdesk"],
  },
  {
    id: "hr",
    label: "HR",
    description: "Employee records, attendance and leave",
    icon: Users2,
    to: "/hr",
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    module: ["HR"],
  },
  {
    id: "payroll",
    label: "Payroll",
    description: "Salary structures, slips and payroll entries",
    icon: Banknote,
    to: "/payroll",
    colorClass: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
    module: ["Payroll"],
  },
  {
    id: "admin",
    label: "Administration",
    description: "Users, roles and access control",
    icon: ShieldCheck,
    to: "/admin/users",
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    roles: ["System Manager"],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Company defaults, preferences and notifications",
    icon: Settings,
    to: "/settings",
    colorClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  {
    id: "account",
    label: "My Account",
    description: "Your profile, roles and security",
    icon: UserCircle,
    to: "/account",
    colorClass: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    hideOnLogin: true,
  },
];
