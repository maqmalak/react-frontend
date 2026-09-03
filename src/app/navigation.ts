import {
  LayoutDashboard,
  Ship,
  FileText,
  Package,
  Factory,
  Warehouse,
  BarChart3,
  Settings,
  ShoppingCart,
  Container,
  Calculator,
  Boxes,
  ClipboardList,
  Truck,
  ArrowLeftRight,
  Users,
  Receipt,
  Coins,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon?: LucideIcon;
  /** Roles allowed to see this entry. Empty = everyone (server still enforces). */
  roles?: string[];
}

export interface NavGroup {
  /** Group heading; omitted for standalone links. */
  title?: string;
  items: NavItem[];
}

/** Sidebar information architecture for the Apparel ERP workspace. */
export const NAVIGATION: NavGroup[] = [
  {
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    title: "Import",
    items: [
      { label: "Purchase Orders", to: "/import/purchase-orders", icon: ShoppingCart },
      { label: "Import Shipments", to: "/import/shipments", icon: Container },
      { label: "Import Cost Sheets", to: "/import/cost-sheets", icon: Calculator },
    ],
  },
  {
    title: "Purchase",
    items: [
      { label: "Purchase Receipts", to: "/purchase/receipts", icon: Package },
      { label: "Purchase Invoices", to: "/purchase/invoices", icon: Receipt },
      { label: "Landed Cost Vouchers", to: "/purchase/landed-costs", icon: Coins },
    ],
  },
  {
    title: "Export",
    items: [
      { label: "LC Proforma", to: "/export/lc-proforma", icon: FileText },
      { label: "Export Orders", to: "/export/orders", icon: Package },
      { label: "Export Packing", to: "/export/packing", icon: Boxes },
      { label: "Export Shipments", to: "/export/shipments", icon: Ship },
    ],
  },
  {
    title: "Production",
    items: [
      { label: "Work Orders", to: "/production/work-orders", icon: Factory },
      { label: "Production Status", to: "/production/status", icon: ClipboardList },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Stock", to: "/inventory/stock", icon: Warehouse },
      { label: "Material Movement", to: "/inventory/movement", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Import Reports", to: "/reports/import", icon: BarChart3 },
      { label: "Export Reports", to: "/reports/export", icon: BarChart3 },
      { label: "Shipment Reports", to: "/reports/shipments", icon: Truck },
      { label: "LC Reports", to: "/reports/lc", icon: FileText },
    ],
  },
  {
    title: "Masters",
    items: [
      { label: "Items", to: "/masters/items", icon: Boxes },
      { label: "Customers", to: "/masters/customers", icon: Users },
      { label: "Suppliers", to: "/masters/suppliers", icon: Users },
    ],
  },
  {
    items: [{ label: "Settings", to: "/settings", icon: Settings }],
  },
];

/** Human-readable breadcrumb segments for a pathname. */
export const ROUTE_TITLES: Record<string, string> = {
  "": "Dashboard",
  import: "Import",
  export: "Export",
  production: "Production",
  inventory: "Inventory",
  reports: "Reports",
  masters: "Masters",
  settings: "Settings",
  purchase: "Purchase",
  "purchase-orders": "Purchase Orders",
  receipts: "Purchase Receipts",
  invoices: "Purchase Invoices",
  "landed-costs": "Landed Cost Vouchers",
  shipments: "Shipments",
  "cost-sheets": "Cost Sheets",
  "lc-proforma": "LC Proforma",
  orders: "Orders",
  packing: "Packing",
  "work-orders": "Work Orders",
  status: "Status",
  stock: "Stock",
  movement: "Material Movement",
  items: "Items",
  customers: "Customers",
  suppliers: "Suppliers",
  lc: "LC",
  new: "New",
};

export function titleForSegment(segment: string): string {
  return (
    ROUTE_TITLES[segment] ??
    segment
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ")
  );
}