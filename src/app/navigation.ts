import {
  LayoutDashboard,
  Radar,
  Ship,
  FileText,
  Package,
  Factory,
  Warehouse,
  BarChart3,
  Settings as SettingsIcon,
  ShoppingCart,
  Container,
  Calculator,
  Boxes,
  ClipboardList,
  Truck,
  ArrowLeftRight,
  Users,
  ShieldCheck,
  Receipt,
  Coins,
  Handshake,
  Cog,
  Building2,
  LifeBuoy,
  Users2,
  Banknote,
  UserCircle,
  Building,
  Bell,
  Lock,
  ListTree,
  CalendarRange,
  ScrollText,
  Wallet,
  BookOpen,
  Rocket,
  Scale,
  TrendingUp,
  PieChart,
  Sliders,
  CreditCard,
  UserPlus,
  Building2 as OrgIcon,
  CheckSquare,
  StickyNote,
  Phone,
  FileSignature,
  Repeat,
  Contact2,
  CalendarDays,
  Radio,
  ListChecks,
  MapPin,
  Quote,
  LayoutGrid,
  IdCard,
  GitBranch,
  CalendarCheck,
  LogIn,
  CalendarOff,
  CalendarPlus2,
  Award,
  Clock3,
  FileSpreadsheet,
  PlayCircle,
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

// "Buying" merges the old standalone Import app (procurement planning) and
// Purchase app (receiving/billing) into one sidebar — the two titled groups
// below render as visually separated sections (see Sidebar's NavLinks),
// which is the divider between them. Both the `purchase` and `import` route
// segments point at this same array so the sidebar looks identical no
// matter which of the two (still-separate) URL prefixes you're on.
const BUYING_NAV: NavGroup[] = [
  {
    title: "Procurement",
    items: [
      { label: "Material Requests", to: "/import/material-requests", icon: ClipboardList },
      { label: "Requests for Quotation", to: "/import/rfqs", icon: Quote },
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
];

// Same idea for "Selling" — merges the old standalone Export app in as a
// second titled section. Both `selling` and `export` segments share this array.
const SELLING_NAV: NavGroup[] = [
  {
    title: "Selling",
    items: [
      { label: "Sales Orders", to: "/selling/sales-orders", icon: Handshake },
      { label: "Delivery Notes", to: "/selling/delivery-notes", icon: Package },
      { label: "Sales Invoices", to: "/selling/sales-invoices", icon: Receipt },
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
];

/**
 * Per-app sidebar navigation, keyed by the route's first path segment (which
 * lines up 1:1 with each tile's `to` in `app/apps.ts`, except `stock` which
 * shares the `inventory` segment/pages). The Desktop app-launcher (`/`) is
 * the one route with no entry here — it renders without a sidebar entirely.
 */
export const APP_NAVIGATION: Record<string, NavGroup[]> = {
  dashboard: [
    { items: [{ label: "Overview", to: "/dashboard", icon: LayoutDashboard }] },
  ],
  import: BUYING_NAV,
  purchase: BUYING_NAV,
  export: SELLING_NAV,
  production: [
    {
      title: "Production",
      items: [
        { label: "Work Orders", to: "/production/work-orders", icon: Factory },
        { label: "Production Status", to: "/production/status", icon: ClipboardList },
      ],
    },
  ],
  inventory: [
    {
      title: "Stock",
      items: [
        { label: "Stock", to: "/inventory/stock", icon: Warehouse },
        { label: "Material Movement", to: "/inventory/stock-entries", icon: ArrowLeftRight },
        { label: "Stock Ledger", to: "/inventory/reports/stock-ledger", icon: BookOpen },
      ],
    },
  ],
  reports: [
    {
      title: "Reports",
      items: [
        { label: "Import Reports", to: "/reports/import", icon: BarChart3 },
        { label: "Export Reports", to: "/reports/export", icon: BarChart3 },
        { label: "Shipment Reports", to: "/reports/shipments", icon: Truck },
        { label: "LC Reports", to: "/reports/lc", icon: FileText },
      ],
    },
  ],
  masters: [
    {
      title: "Masters",
      items: [
        { label: "Items", to: "/masters/items", icon: Boxes },
        { label: "Customers", to: "/masters/customers", icon: Users },
        { label: "Suppliers", to: "/masters/suppliers", icon: Users },
      ],
    },
  ],
  accounting: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", to: "/accounting", icon: LayoutDashboard },
        { label: "Getting Started", to: "/accounting/getting-started", icon: Rocket },
      ],
    },
    {
      title: "Masters",
      items: [
        { label: "Chart of Accounts", to: "/accounting/chart-of-accounts", icon: ListTree },
        { label: "Cost Centers", to: "/accounting/cost-centers", icon: Scale },
        { label: "Fiscal Years", to: "/accounting/fiscal-years", icon: CalendarRange },
        { label: "Payment Terms", to: "/accounting/payment-terms", icon: ScrollText },
        { label: "Mode of Payment", to: "/accounting/mode-of-payment", icon: Wallet },
        { label: "Sales Tax Templates", to: "/accounting/tax-templates/sales", icon: Receipt },
        { label: "Purchase Tax Templates", to: "/accounting/tax-templates/purchase", icon: Receipt },
      ],
    },
    {
      title: "Transactions",
      items: [
        { label: "Journal Entries", to: "/accounting/journal-entries", icon: BookOpen },
        { label: "Payment Entries", to: "/accounting/payment-entries", icon: CreditCard },
      ],
    },
    {
      title: "Reports",
      items: [
        { label: "General Ledger", to: "/accounting/reports/general-ledger", icon: FileText },
        { label: "Trial Balance", to: "/accounting/reports/trial-balance", icon: Scale },
        { label: "Profit and Loss", to: "/accounting/reports/profit-and-loss", icon: TrendingUp },
        { label: "Balance Sheet", to: "/accounting/reports/balance-sheet", icon: PieChart },
        { label: "Cash Flow", to: "/accounting/reports/cash-flow", icon: Wallet },
      ],
    },
    {
      title: "Setup",
      items: [
        { label: "Accounts Settings", to: "/accounting/setup/settings", icon: Sliders },
        { label: "Accounting Dimensions", to: "/accounting/setup/dimensions", icon: Sliders },
      ],
    },
  ],
  admin: [
    {
      title: "Administration",
      items: [
        { label: "Users", to: "/admin/users", icon: Users, roles: ["System Manager"] },
        { label: "Roles", to: "/admin/roles", icon: ShieldCheck, roles: ["System Manager"] },
      ],
    },
  ],
  selling: SELLING_NAV,
  crm: [
    {
      title: "Overview",
      items: [{ label: "Dashboard", to: "/crm/dashboard", icon: LayoutGrid }],
    },
    {
      title: "Relationships",
      items: [
        { label: "Contacts", to: "/crm/contacts", icon: Contact2 },
        { label: "Organizations", to: "/crm/organizations", icon: OrgIcon },
      ],
    },
    {
      title: "Pipeline",
      items: [
        { label: "Leads", to: "/crm/leads", icon: UserPlus },
        { label: "Deals", to: "/crm/deals", icon: Handshake },
        { label: "Contracts", to: "/crm/contracts", icon: FileSignature },
        { label: "Prospect Scraper", to: "/crm/prospect-scraper", icon: Radar },
      ],
    },
    {
      title: "Work",
      items: [
        { label: "Tasks", to: "/crm/tasks", icon: CheckSquare },
        { label: "Notes", to: "/crm/notes", icon: StickyNote },
        { label: "Call Logs", to: "/crm/call-logs", icon: Phone },
      ],
    },
    {
      title: "Activities",
      items: [
        { label: "Follow-ups", to: "/crm/follow-ups", icon: Repeat },
        { label: "Calendar", to: "/crm/calendar", icon: CalendarDays },
      ],
    },
    {
      title: "Masters",
      items: [
        { label: "Lead Sources", to: "/crm/masters/lead-sources", icon: Radio },
        { label: "Lead Statuses", to: "/crm/masters/lead-statuses", icon: ListChecks },
        { label: "Territories", to: "/crm/masters/territories", icon: MapPin },
        { label: "Industries", to: "/crm/masters/industries", icon: Factory },
        { label: "Salutations", to: "/crm/masters/salutations", icon: Quote },
      ],
    },
  ],
  subcontracting: [{ items: [{ label: "Subcontracting", to: "/subcontracting", icon: Cog }] }],
  assets: [{ items: [{ label: "Assets", to: "/assets", icon: Building2 }] }],
  support: [{ items: [{ label: "Support", to: "/support", icon: LifeBuoy }] }],
  hr: [
    {
      title: "Employees",
      items: [
        { label: "Employees", to: "/hr/employees", icon: Users2 },
        { label: "Departments", to: "/hr/departments", icon: Building2 },
        { label: "Designations", to: "/hr/designations", icon: IdCard },
        { label: "Branches", to: "/hr/branches", icon: GitBranch },
      ],
    },
    {
      title: "Attendance & Leave",
      items: [
        { label: "Attendance", to: "/hr/attendance", icon: CalendarCheck },
        { label: "Checkins", to: "/hr/checkins", icon: LogIn },
        { label: "Leave Applications", to: "/hr/leave-applications", icon: CalendarOff },
        { label: "Leave Allocations", to: "/hr/leave-allocations", icon: CalendarPlus2 },
        { label: "Holiday Lists", to: "/hr/holiday-lists", icon: CalendarDays },
      ],
    },
    {
      title: "Claims & Extras",
      items: [
        { label: "Expense Claims", to: "/hr/expense-claims", icon: Receipt },
        { label: "Employee Advances", to: "/hr/advances", icon: Wallet },
        { label: "Gratuity", to: "/hr/gratuity", icon: Award },
        { label: "Shift Assignments", to: "/hr/shift-assignments", icon: Clock3 },
      ],
    },
  ],
  payroll: [
    {
      title: "Payroll",
      items: [
        { label: "Salary Components", to: "/payroll/salary-components", icon: Coins },
        { label: "Salary Structures", to: "/payroll/salary-structures", icon: FileSpreadsheet },
        { label: "Structure Assignments", to: "/payroll/salary-structure-assignments", icon: FileSignature },
        { label: "Salary Slips", to: "/payroll/salary-slips", icon: Banknote },
        { label: "Payroll Entries", to: "/payroll/entries", icon: PlayCircle },
      ],
    },
  ],
  settings: [
    {
      title: "Settings",
      items: [
        { label: "General", to: "/settings", icon: SettingsIcon },
        { label: "Company", to: "/settings/company", icon: Building },
        { label: "Notifications", to: "/settings/notifications", icon: Bell },
      ],
    },
  ],
  account: [
    {
      title: "My Account",
      items: [
        { label: "Profile", to: "/account", icon: UserCircle },
        { label: "Security", to: "/account/security", icon: Lock },
      ],
    },
  ],
};

/** Route segment -> human label for the sidebar's app header. */
export const APP_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  import: "Buying",
  purchase: "Buying",
  export: "Selling",
  production: "Production",
  inventory: "Stock",
  reports: "Reports",
  masters: "Masters",
  accounting: "Accounting",
  admin: "Administration",
  selling: "Selling",
  crm: "CRM",
  subcontracting: "Subcontracting",
  assets: "Assets",
  support: "Support",
  hr: "HR",
  payroll: "Payroll",
  settings: "Settings",
  account: "My Account",
};

/** First path segment (`"/import/foo"` -> `"import"`, `"/"` -> `""`). */
export function appSegmentForPath(pathname: string): string {
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

/** All sidebar nav groups flattened — used for the login page's live stat count. */
export const NAVIGATION: NavGroup[] = Object.values(APP_NAVIGATION).flat();

/** Human-readable breadcrumb segments for a pathname. */
export const ROUTE_TITLES: Record<string, string> = {
  "": "Desktop",
  home: "Desktop",
  dashboard: "Dashboard",
  admin: "Administration",
  users: "Users",
  roles: "Roles",
  import: "Buying",
  export: "Selling",
  production: "Production",
  inventory: "Stock",
  reports: "Reports",
  masters: "Masters",
  settings: "Settings",
  accounting: "Accounting",
  "getting-started": "Getting Started",
  "chart-of-accounts": "Chart of Accounts",
  "cost-centers": "Cost Centers",
  "fiscal-years": "Fiscal Years",
  "payment-terms": "Payment Terms",
  "mode-of-payment": "Mode of Payment",
  "tax-templates": "Tax Templates",
  sales: "Sales",
  "journal-entries": "Journal Entries",
  "payment-entries": "Payment Entries",
  "general-ledger": "General Ledger",
  "trial-balance": "Trial Balance",
  "profit-and-loss": "Profit and Loss",
  "balance-sheet": "Balance Sheet",
  "cash-flow": "Cash Flow",
  setup: "Setup",
  dimensions: "Accounting Dimensions",
  selling: "Selling",
  crm: "CRM",
  subcontracting: "Subcontracting",
  assets: "Assets",
  support: "Support",
  hr: "HR",
  payroll: "Payroll",
  account: "My Account",
  profile: "Profile",
  security: "Security",
  company: "Company",
  notifications: "Notifications",
  purchase: "Buying",
  "purchase-orders": "Purchase Orders",
  "material-requests": "Material Requests",
  rfqs: "Requests for Quotation",
  "stock-ledger": "Stock Ledger",
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
  "stock-entries": "Stock Entries",
  items: "Items",
  "sales-orders": "Sales Orders",
  "sales-invoices": "Sales Invoices",
  "delivery-notes": "Delivery Notes",
  customers: "Customers",
  suppliers: "Suppliers",
  lc: "LC",
  new: "New",
  leads: "Leads",
  deals: "Deals",
  organizations: "Accounts",
  "follow-ups": "Follow-ups",
  calendar: "Calendar",
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
