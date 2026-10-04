import {
  LayoutDashboard,
  ClipboardCheck,
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
   * Frappe apps this tile's pages need on the backend (all of them). The Desktop, the home sidebar and the
   * route itself are hidden on a site that lacks any of them (see useInstalledApps) — e.g. Production needs
   * `micromax`, so the school site shows no Production tile. Undefined = core ERPNext/Frappe, always shown.
   */
  apps?: string[];
  /**
   * Curated capability bullets (copied from the public website's module
   * catalogue, website-data.ts MODULES) shown under the tile's description.
   * When unset, the Desktop falls back to real, live doctype names for
   * `module` — accurate, but the first few doctypes ERPNext returns for a
   * module aren't necessarily its most meaningful ones (e.g. Accounting
   * surfaced "Account Closing Balance" ahead of "Journal Entry").
   */
  features?: string[];
  /** Short line under the title (a few words). */
  tagline?: string;
  /** Desktop section this tile sits in (see APP_GROUPS). */
  group?: string;
}

/** Desktop sections, in display order. */
export const APP_GROUPS = [
  "Overview",
  "Finance & Setup",
  "Operations",
  "People",
  "Customers & Collaboration",
  "Industry Solutions",
  "System",
] as const;

/** Desktop app-launcher — one tile per module, shown after login, in this order. */
export const APPS: AppTile[] = [
  // ------------------------------------------------------------------ Overview
  {
    id: "dashboard",
    label: "Dashboards",
    tagline: "Executive summary",
    group: "Overview",
    description: "The whole mill at a glance — headline KPIs, insights and trade in one view.",
    icon: LayoutDashboard,
    to: "/dashboard",
    apps: ["mm_core"],
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    features: ["Revenue, profit & cash", "Insight feed", "Module scorecards", "Export & import"],
  },
  {
    id: "analytics",
    label: "Analytics",
    tagline: "Fiscal-year dashboards",
    group: "Overview",
    description: "Drill-down dashboards for every department, Jul–Jun by default.",
    icon: BarChart3,
    to: "/analytics/accounts",
    apps: ["mm_core"],
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    features: ["Sales & buying analysis", "Production yield & OPS", "Quality & HR", "Financial statements"],
  },
  {
    id: "reports",
    label: "Reports",
    tagline: "Registers & ledgers",
    group: "Overview",
    description: "Audit-ready registers and query reports across every module.",
    icon: BarChart3,
    to: "/reports/import",
    apps: ["micromax"],
    colorClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    features: ["Stock & GL ledgers", "Ageing analysis", "Shipment registers", "Custom query reports"],
  },
  // ------------------------------------------------------------------ Finance & Setup
  {
    id: "accounting",
    label: "Accounting",
    tagline: "Books, tax & statements",
    group: "Finance & Setup",
    description: "Multi-currency general ledger with tax compliance and closed-loop reporting.",
    icon: Landmark,
    to: "/accounting",
    colorClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    module: ["Accounts"],
    features: ["Chart of accounts", "Journal & payment entries", "Trial balance & P&L", "Bank reconciliation"],
  },
  {
    id: "masters",
    label: "Setup",
    tagline: "Masters & company defaults",
    group: "Finance & Setup",
    description: "The shared records every transaction uses — items, parties and their groups.",
    icon: Boxes,
    to: "/masters/items",
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    features: ["Items & item groups", "Customers & groups", "Suppliers & groups", "Company defaults"],
  },
  // ------------------------------------------------------------------ Operations
  {
    id: "purchase",
    label: "Buying",
    tagline: "Procure to pay",
    group: "Operations",
    description: "From material request to supplier invoice, with import costing and landed cost.",
    icon: Package,
    to: "/import/material-requests",
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    features: ["Material requests & RFQs", "Purchase orders", "Receipts & invoices", "Landed cost"],
  },
  {
    id: "selling",
    label: "Selling",
    tagline: "Order to cash",
    group: "Operations",
    description: "Domestic and export orders through delivery, invoicing and collection.",
    icon: ShoppingBag,
    to: "/selling/sales-orders",
    colorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    module: ["Selling"],
    features: ["Sales orders", "Delivery notes", "Sales invoices", "Export & LC proforma"],
  },
  {
    id: "production",
    label: "Production",
    tagline: "Plan, spin & cost",
    group: "Operations",
    description: "Blend BOMs, routings and work orders with yield, OPS and operating cost.",
    icon: Factory,
    to: "/production",
    apps: ["micromax"],
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    features: ["Blend BOMs & routings", "Work orders & job cards", "Workstations & downtime", "Yield & spindle planning"],
  },
  {
    id: "stock",
    label: "Stock",
    tagline: "Inventory & warehouses",
    group: "Operations",
    description: "Real-time stock across godowns, WIP and finished-goods stores.",
    icon: Warehouse,
    to: "/inventory/stock",
    colorClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    features: ["Multi-warehouse balances", "Material movement", "Stock ledger", "Batch & lot tracking"],
  },
  {
    id: "assets",
    label: "Assets",
    tagline: "Fixed asset register",
    group: "Operations",
    description: "Machinery and equipment from capitalisation to depreciation and disposal.",
    icon: Building2,
    to: "/asset-management",
    colorClass: "bg-stone-500/10 text-stone-600 dark:text-stone-400",
    module: ["Assets"],
    features: ["Asset register", "Depreciation schedules", "Movements & repairs", "Categories & locations"],
  },
  {
    id: "subcontracting",
    label: "Conversion",
    tagline: "Conversion & subcontracting",
    group: "Operations",
    description: "Yarn conversion for third parties and work sent to subcontractors.",
    icon: Cog,
    to: "/subcontracting",
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    module: ["Subcontracting", "Manufacturing"],
    features: ["Subcontracting orders", "Material supplied", "Subcontracting receipts", "Conversion costing"],
  },
  {
    id: "quality",
    label: "Quality",
    tagline: "QA / QC & lab",
    group: "Operations",
    description: "Fibre, process and yarn lab inspections with SOPs, goals and CAPA.",
    icon: ClipboardCheck,
    to: "/quality",
    colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    features: ["Incoming fibre tests", "Yarn lab (U%, CSP, IPI)", "Non-conformance & CAPA", "Goals & reviews"],
  },
  // ------------------------------------------------------------------ People
  {
    id: "hr",
    label: "HR",
    tagline: "People & attendance",
    group: "People",
    description: "Employees, shifts, attendance and leave for a three-shift workforce.",
    icon: Users2,
    to: "/hr",
    apps: ["hrms"],
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    module: ["HR"],
    features: ["Employee records", "Shifts & biometric check-ins", "Attendance & leave", "Advances & claims"],
  },
  {
    id: "payroll",
    label: "Payroll",
    tagline: "Salary & statutory",
    group: "People",
    description: "Monthly payroll from attendance to bank advice, with EOBI and tax.",
    icon: Banknote,
    to: "/payroll",
    apps: ["hrms"],
    colorClass: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
    module: ["Payroll"],
    features: ["Salary structures", "Payroll runs", "Salary slips", "Components & deductions"],
  },
  // ------------------------------------------------------------------ Customers & Collaboration
  {
    id: "crm",
    label: "CRM",
    tagline: "Leads to repeat orders",
    group: "Customers & Collaboration",
    description: "Pipeline from first enquiry to repeat order, with every touchpoint logged.",
    icon: Handshake,
    to: "/crm",
    apps: ["crm"],
    colorClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    module: ["CRM", "FCRM"],
    features: ["Leads & deals", "Activities & follow-ups", "Targets vs achievement", "Customer 360"],
  },
  {
    id: "support",
    label: "Support",
    tagline: "Tickets & issues",
    group: "Customers & Collaboration",
    description: "Customer complaints and service tickets with SLA tracking.",
    icon: LifeBuoy,
    to: "/support",
    colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    module: ["Support", "Helpdesk"],
    features: ["Tickets & issues", "SLA tracking", "Customer complaints", "Resolution history"],
  },
  {
    id: "workflow",
    label: "Workflow",
    tagline: "Approvals · Alerts · Notifications",
    group: "Customers & Collaboration",
    description: "Route documents to the right approver, escalate when they stall and notify the team.",
    icon: Workflow,
    to: "/approvals",
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    features: ["Multi-step approvals", "Amount-based routing", "Email & in-app alerts", "SLA reminders"],
  },
  {
    id: "projects",
    label: "Projects",
    tagline: "Tasks & delivery",
    group: "Customers & Collaboration",
    description: "Projects, tasks, timesheets and cost tracking.",
    icon: FolderKanban,
    to: "/projects",
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    module: ["Projects"],
    features: ["Project tracking", "Task board", "Timesheets & costing", "Overdue alerts"],
  },
  // ------------------------------------------------------------------ Industry Solutions
  {
    id: "pos",
    label: "Point of Sale",
    tagline: "Counter billing",
    group: "Industry Solutions",
    description: "Fast counter billing that posts straight into stock and the ledger.",
    icon: CreditCard,
    to: "/pos",
    apps: ["posawesome"],
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    module: ["POS", "Selling"],
    features: ["Touch billing screen", "Barcode & scale items", "Multi-counter & shift", "Cash, card & wallet"],
  },
  {
    id: "hospital",
    label: "Hospital",
    tagline: "Patient journey",
    group: "Industry Solutions",
    description: "From registration and OPD through pharmacy, lab and IPD billing.",
    icon: Stethoscope,
    to: "/hospital",
    apps: ["healthcare"],
    colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    features: ["Patient registration & MRN", "OPD & token queue", "Clinical notes & orders", "Pharmacy, lab & IPD billing"],
  },
  {
    id: "education",
    label: "Education",
    tagline: "Admission to results",
    group: "Industry Solutions",
    description: "Admissions, academics and fee collection for schools and institutes.",
    icon: GraduationCap,
    to: "/education",
    apps: ["education"],
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    features: ["Admissions & enrolment", "Attendance & timetable", "Exams & report cards", "Fees & concessions"],
  },
  // ------------------------------------------------------------------ System
  {
    id: "admin",
    label: "Administration",
    tagline: "Users & access",
    group: "System",
    description: "Users, roles and audit trail for a controlled, compliant deployment.",
    icon: ShieldCheck,
    to: "/admin/users",
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    roles: ["System Manager"],
    features: ["Users & roles", "Field-level permissions", "Audit trail", "Backup & restore"],
  },
  {
    id: "settings",
    label: "Settings",
    tagline: "Module preferences",
    group: "System",
    description: "Company, buying, selling, import, export and POS settings in one place.",
    icon: Settings,
    to: "/settings",
    colorClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    features: ["Company", "Buying & selling", "Import & export", "POS"],
  },
  {
    id: "account",
    label: "My Account",
    tagline: "Profile & security",
    group: "System",
    description: "Your profile, roles, notifications and password.",
    icon: UserCircle,
    to: "/account",
    colorClass: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    hideOnLogin: true,
    features: ["Profile", "Roles", "Notifications", "Security"],
  },
];
