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
    id: "admin",
    label: "Administration",
    description: "Users, roles and access control",
    icon: ShieldCheck,
    to: "/admin/users",
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    roles: ["System Manager"],
  },
];
