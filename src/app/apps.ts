import {
  LayoutDashboard,
  Package,
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
  CreditCard,
  Stethoscope,
  GraduationCap,
  Workflow,
  FolderKanban,
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
  /**
   * Curated capability bullets (copied from the public website's module
   * catalogue, website-data.ts MODULES) shown under the tile's description.
   * When unset, the Desktop falls back to real, live doctype names for
   * `module` — accurate, but the first few doctypes ERPNext returns for a
   * module aren't necessarily its most meaningful ones (e.g. Accounting
   * surfaced "Account Closing Balance" ahead of "Journal Entry").
   */
  features?: string[];
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
    features: [
      "Financial statements",
      "Sales analytics",
      "Buying analytics",
      "Stock",
      "Production",
      "HR/Payroll",
    ],
  },
  {
    id: "purchase",
    label: "Buying",
    description: "Procurement from material request to purchase invoice",
    icon: Package,
    to: "/import/material-requests",
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    features: ["Material requests", "RFQ comparison", "Purchase orders", "Purchase receipts & invoices"],
  },
  {
    id: "production",
    label: "Production",
    description: "Plan, issue and cost manufacturing on the shop floor",
    icon: Factory,
    to: "/production",
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    features: ["Multi-level BOM", "Work orders", "Job cards", "WIP valuation"],
  },
  {
    id: "reports",
    label: "Reports",
    description: "Audit-ready registers and query reports across every module",
    icon: BarChart3,
    to: "/reports/import",
    colorClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    features: ["Stock & GL ledgers", "Ageing analysis", "Shipment registers", "Custom query reports"],
  },
  {
    id: "masters",
    label: "Masters",
    description: "Items, customers and suppliers",
    icon: Boxes,
    to: "/masters/items",
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    features: ["Group Item", "Item", "Group Supplier", "Supplier", "Group Customer", "Customer"],
  },
  {
    id: "accounting",
    label: "Accounting",
    description: "Multi-currency books, tax compliance and closed-loop reporting",
    icon: Landmark,
    to: "/accounting",
    colorClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    module: ["Accounts"],
    features: ["Chart of accounts", "Journal entries", "Trial balance & P&L", "Bank reconciliation"],
  },
  {
    id: "selling",
    label: "Selling",
    description: "Order to cash for domestic and export customers",
    icon: ShoppingBag,
    to: "/selling/sales-orders",
    colorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    module: ["Selling"],
    features: ["Sales orders", "Delivery notes", "Sales invoices", "Buyer-wise price lists"],
  },
  {
    id: "crm",
    label: "CRM",
    description: "Pipeline from first enquiry to repeat order",
    icon: Handshake,
    to: "/crm",
    colorClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    module: ["CRM", "FCRM"],
    features: ["Leads & deals", "Activities & events", "Targets vs. achievement", "Customer 360"],
  },
  {
    id: "stock",
    label: "Stock",
    description: "Real-time stock across warehouses, batches and serials",
    icon: Warehouse,
    to: "/inventory/stock",
    colorClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    features: ["Multi-warehouse", "Batch & serial tracking", "Stock ledger", "Stock reconciliation"],
  },
  {
    id: "pos",
    label: "Point of Sale",
    description: "Counter billing that posts straight into stock and the ledger",
    icon: CreditCard,
    to: "/pos",
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    module: ["POS", "Selling"],
    features: [
      "Touch billing screen",
      "Barcode & weighing-scale items",
      "Multi-counter, multi-shift, multi-outlet",
      "Cash drawer, card and wallet settlement",
    ],
  },
  {
    id: "hospital",
    label: "Hospital & Clinic",
    description: "The patient journey from registration through discharge and billing",
    icon: Stethoscope,
    to: "/hospital",
    colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    features: [
      "Patient registration & medical record number",
      "OPD appointments and token queue",
      "Clinical notes, diagnoses and service orders",
      "Pharmacy, laboratory and IPD billing",
    ],
  },
  {
    id: "education",
    label: "Education",
    description: "Admissions, academics and fee collection for schools and institutes",
    icon: GraduationCap,
    to: "/education",
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    features: [
      "Admission, enrolment and student records",
      "Attendance, timetable and class schedules",
      "Exams, grading and report cards",
      "Fee schedules, invoices and concessions",
    ],
  },
  {
    id: "workflow",
    label: "Approvals & Alerts",
    description: "Route documents to the right approver and escalate when they stall",
    icon: Workflow,
    to: "/approvals",
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    features: [
      "Multi-step approval",
      "Amount-based routing",
      "Email & in-app alerts",
      "SLA reminders",
    ],
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
    description: "Fixed asset register, depreciation, movements and repairs",
    icon: Building2,
    to: "/asset-management",
    colorClass: "bg-stone-500/10 text-stone-600 dark:text-stone-400",
    module: ["Assets"],
    features: ["Asset register", "Depreciation schedules", "Movements & repairs", "Categories & locations"],
  },
  {
    id: "projects",
    label: "Projects",
    description: "Projects, tasks and delivery tracking",
    icon: FolderKanban,
    to: "/projects",
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    module: ["Projects"],
    features: ["Project tracking", "Task board", "Costing", "Overdue alerts"],
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
    description: "People, attendance and salary in the same system as the ledger",
    icon: Users2,
    to: "/hr",
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    module: ["HR"],
    features: ["Employee records", "Attendance & leave", "Salary structures", "Payroll entries"],
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
    description: "Users, roles and audit trail for a compliant deployment",
    icon: ShieldCheck,
    to: "/admin/users",
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    roles: ["System Manager"],
    features: ["Role-based access", "Field-level permissions", "Audit trail", "Backup & restore"],
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
