import {
  Activity,
  Bell,
  Boxes,
  Calculator,
  ChartColumn,
  CircuitBoard,
  Cloud,
  CreditCard,
  Database,
  Eye,
  Factory,
  Gauge,
  Globe,
  GraduationCap,
  Handshake,
  HardDrive,
  Landmark,
  Layers,
  Lock,
  Network,
  Package,
  Route,
  ScrollText,
  Server,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Truck,
  Warehouse,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Company profile
 *
 * Everything marketing-facing lives here so copy can be edited without
 * touching layout. Contact details are placeholders — swap them for the
 * registered address / phone before this page goes live.
 * ------------------------------------------------------------------ */

export interface CompanyFact {
  label: string;
  value: string;
}

export interface CompanyValue {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const COMPANY = {
  legalName: "MicroMax Erp Pvt Ltd",
  shortName: "MicroMax ERP",
  productName: "MicroMax ERP Suite",
  tagline: "Run trading, manufacturing, retail, healthcare and education on one platform.",
  intro:
    "MicroMax Erp Pvt Ltd builds and operates an ERPNext-powered business suite for trading, manufacturing, distribution, retail, healthcare and education",
  about: [
    "MicroMax Erp Pvt Ltd is an enterprise software and business-process company. We deliver an end-to-end ERPNext platform that unifies procurement, production, warehousing, sales, point of sale, service delivery and accounting into a single, auditable system of record.",
    "Our suite is opinionated where it matters: letters of credit, import shipments, landed-cost sheets, export packing, counter billing, patient records and student ledgers are first-class processes — not spreadsheets bolted onto a generic ERP. Everything else is standard ERPNext, which means clean upgrades, open data and no vendor lock-in.",
    "Alongside the ERP we build the analytics layer. Operational data is published to Power BI for executive reporting and to Grafana for real-time monitoring, so the same numbers that run the business also drive its decisions.",
    "Our infrastructure practice covers the ground beneath the software: datacenter build-out and hosting, server virtualization and capacity planning. That means the ERP, its database and its analytics stack can be run on hardware we specify, size and support — on your premises or ours.",
  ],
  stats: [
    { value: "18+", label: "modules" },
    { value: "1", label: "source of truth" },
    { value: "100%", label: "open data" },
    { value: "24/7", label: "ops visibility" },
  ],
  facts: [
    { label: "Legal name", value: "MicroMax Erp Pvt Ltd" },
    { label: "Product", value: "MicroMax ERP Suite (ERP / BI Analytics, Datacenter, Virtualization)" },
    { label: "Focus", value: "Buying & Selling trading, manufacturing, distribution, POS, Hospital, Education" },
    { label: "Deployment", value: "On-prem datacenter, virtualized or managed cloud" },
    { label: "Analytics", value: "Microsoft Power BI + Grafana" },
    { label: "Support", value: "Implementation, training and AMC" },
  ] as CompanyFact[],
  values: [
    {
      icon: ShieldCheck,
      title: "Server-enforced control",
      description:
        "Role and permission rules live in the backend, so no screen — web, mobile or BI — can read or write outside its grant.",
    },
    {
      icon: Zap,
      title: "Real-time by default",
      description:
        "Every dashboard reads live documents. No overnight batch, no stale export, no reconciliation surprises.",
    },
    {
      icon: Network,
      title: "Open and extensible",
      description:
        "Open-source core, documented REST/RPC APIs and custom fields instead of forks — integration without lock-in.",
    },
    {
      icon: Lock,
      title: "Your data stays yours",
      description:
        "Deploy on your own infrastructure, keep read replicas for analytics and export everything at any time.",
    },
  ] as CompanyValue[],
  /**
   * Placeholder contact details — replace with the real registered address,
   * phone and mailbox before publishing.
   */
  contact: {
    address: "Head Office — 213-C Sammanabad, Faisalabad, Pakistan",
    phone: "+92 300 7212058",
    email: "info@micromax-erp.com",
    website: "www.micromax-erp.com",
  },
};

/* ------------------------------------------------------------------ *
 * Module catalogue — one entry per implemented ERP module, with the
 * capabilities we actually ship (shown as feature chips on the page).
 * ------------------------------------------------------------------ */

export interface ModuleProfile {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  features: string[];
  /** Dark-mode-safe accent pair, same convention as ui/badge.tsx. */
  tone: string;
}

export const MODULES: ModuleProfile[] = [
  {
    id: "trade",
    label: "Import & Export",
    icon: Globe,
    description: "Letter of credit to shipment closing, with full document control.",
    features: ["LC Proforma", "Import shipment", "Export shipment & packing", "Import cost sheet"],
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    id: "buying",
    label: "Buying",
    icon: Package,
    description: "Procurement from material request to purchase invoice.",
    features: ["Material requests", "RFQ comparison", "Purchase orders", "Purchase receipts & invoices"],
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "selling",
    label: "Selling",
    icon: ShoppingBag,
    description: "Order to cash for domestic and export customers.",
    features: ["Sales orders", "Delivery notes", "Sales invoices", "Buyer-wise price lists"],
    tone: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    id: "production",
    label: "Production",
    icon: Factory,
    description: "Plan, issue and cost manufacturing on the shop floor.",
    features: ["Multi-level BOM", "Work orders", "Job cards", "WIP valuation"],
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    id: "stock",
    label: "Inventory",
    icon: Warehouse,
    description: "Real-time stock across warehouses, batches and serials.",
    features: ["Multi-warehouse", "Batch & serial tracking", "Stock ledger", "Stock reconciliation"],
    tone: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: Landmark,
    description: "Multi-currency books, tax compliance and closed-loop reporting.",
    features: ["Chart of accounts", "Journal entries", "Trial balance & P&L", "Bank reconciliation"],
    tone: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    id: "landed",
    label: "Landed Cost",
    icon: Calculator,
    description: "Allocate freight, duty and clearing charges to the right unit cost.",
    features: ["Charge allocation", "Freight & duty breakup", "Cost per unit", "Valuation recalculation"],
    tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    id: "crm",
    label: "CRM",
    icon: Handshake,
    description: "Pipeline from first enquiry to repeat order.",
    features: ["Leads & deals", "Activities & events", "Targets vs. achievement", "Customer 360"],
    tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    id: "hr",
    label: "HR & Payroll",
    icon: Server,
    description: "People, attendance and salary in the same system as the ledger.",
    features: ["Employee records", "Attendance & leave", "Salary structures", "Payroll entries"],
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    id: "reports",
    label: "Reports",
    icon: ScrollText,
    description: "Audit-ready registers and query reports across every module.",
    features: ["Stock & GL ledgers", "Ageing analysis", "Shipment registers", "Custom query reports"],
    tone: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    id: "workflow",
    label: "Approvals & Alerts",
    icon: Workflow,
    description: "Route documents to the right approver and escalate when they stall.",
    features: ["Multi-step approval", "Amount-based routing", "Email & in-app alerts", "SLA reminders"],
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "admin",
    label: "Administration",
    icon: ShieldCheck,
    description: "Users, roles and audit trail for a compliant deployment.",
    features: ["Role-based access", "Field-level permissions", "Audit trail", "Backup & restore"],
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    id: "pos",
    label: "Point of Sale",
    icon: CreditCard,
    description: "Counter billing that posts straight into stock and the ledger.",
    features: [
      "Touch billing screen",
      "Barcode & weighing-scale items",
      "Multi-counter, multi-shift, multi-outlet",
      "Cash drawer, card and wallet settlement",
    ],
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "hospital",
    label: "Hospital & Clinic",
    icon: Stethoscope,
    description: "The patient journey from registration through discharge and billing.",
    features: [
      "Patient registration & medical record number",
      "OPD appointments and token queue",
      "Clinical notes, diagnoses and service orders",
      "Pharmacy, laboratory and IPD billing",
    ],
    tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    description: "Admissions, academics and fee collection for schools and institutes.",
    features: [
      "Admission, enrolment and student records",
      "Attendance, timetable and class schedules",
      "Exams, grading and report cards",
      "Fee schedules, invoices and concessions",
    ],
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "bi",
    label: "BI & Analytics",
    icon: ChartColumn,
    description: "Power BI and Grafana delivery on top of live ERP data.",
    features: [
      "Power BI semantic model & datasets",
      "Grafana real-time operations dashboards",
      "Agreed KPI definitions with data lineage",
      "Scheduled refresh, subscriptions and alerts",
    ],
    tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    id: "datacenter",
    label: "Datacenter",
    icon: HardDrive,
    description: "Hosting, capacity and uptime for the whole stack.",
    features: [
      "Server, storage and rack planning",
      "Power, cooling and redundancy design",
      "Backup, retention and disaster recovery",
      "Uptime and capacity reporting",
    ],
    tone: "bg-stone-500/10 text-stone-600 dark:text-stone-400",
  },
  {
    id: "virtualization",
    label: "Virtualization",
    icon: ServerCog,
    description: "Consolidate workloads and scale without re-buying hardware.",
    features: [
      "Hypervisor setup and performance tuning",
      "VM provisioning from gold templates",
      "Resource pools, clustering and high availability",
      "Snapshots, live migration and backup",
    ],
    tone: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  },
];

/* ------------------------------------------------------------------ *
 * Industries — each vertical lists the modules it uses and the features
 * it gets out of them. `modules` holds MODULES ids; `features` are the
 * outcome-oriented bullets shown beside the module chips.
 * ------------------------------------------------------------------ */

export interface IndustryProfile {
  id: string;
  label: string;
  icon: LucideIcon;
  tagline: string;
  summary: string;
  modules: string[];
  features: string[];
  tone: string;
}

export const INDUSTRIES: IndustryProfile[] = [
  {
    id: "import-export",
    label: "Import & Export Trading",
    icon: Globe,
    tagline: "Letter of credit to landed cost, without the spreadsheet",
    summary:
      "Our core vertical. Track proforma invoices, LCs, shipment milestones, clearing charges and export packing in one chain, so the cost that hits inventory is the true landed cost.",
    modules: ["trade", "landed", "buying", "selling", "accounting", "reports", "workflow"],
    features: [
      "LC Proforma with bank, tenor and amendment history",
      "Import shipment milestones with delay alerts",
      "Import cost sheet allocating freight, duty and clearing per unit",
      "Export packing details and shipment-wise buyer documentation",
      "Multi-currency buying, selling and realised gain/loss",
      "Shipment, LC and cost-sheet registers ready for audit",
    ],
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    id: "textile",
    label: "Textile & Garments",
    icon: Layers,
    tagline: "Style, colour and size traceability from cutting to packing",
    summary:
      "Order-wise style matrices, work orders and subcontracting, with wastage and conversion cost captured at every stage of production.",
    modules: ["production", "stock", "buying", "selling", "trade", "reports"],
    features: [
      "Item variants for style, colour, size and fabric GSM",
      "Cutting, stitching and finishing tracked as work orders",
      "Job work / subcontracting issue and receipt reconciliation",
      "Wastage and rejection capture by process",
      "Order-wise costing and profitability",
      "Export packing list generated from the order matrix",
    ],
    tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    icon: Factory,
    tagline: "Plan capacity, cost the shop floor, control WIP",
    summary:
      "Multi-level BOMs, production plans and work orders in the same ledger as purchase and sales, so variance is visible the day it happens.",
    modules: ["production", "stock", "buying", "accounting", "workflow", "reports"],
    features: [
      "Multi-level BOM with scrap and operation costs",
      "Production planning and work-order scheduling",
      "Material issue vs. consumption variance",
      "WIP and finished-goods valuation",
      "Quality inspection holds and rejection routing",
      "Machine and shift-wise production reporting",
    ],
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    id: "distribution",
    label: "Distribution & Wholesale",
    icon: Truck,
    tagline: "Multi-warehouse stock, tiered pricing, credit control",
    summary:
      "Serve dealers and wholesalers from several warehouses with real-time availability, price lists and enforced credit limits.",
    modules: ["stock", "selling", "buying", "accounting", "crm", "reports"],
    features: [
      "Multi-warehouse availability and stock transfer",
      "Batch / serial tracking with shelf-life visibility",
      "Tiered price lists and customer-specific discounts",
      "Credit limit checks and overdue blocking at order entry",
      "Delivery notes and route-wise despatch registers",
      "Ageing, reorder level and fast/slow-mover analysis",
    ],
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "retail",
    label: "Retail, POS & E-commerce",
    icon: ShoppingCart,
    tagline: "Fast counter billing with back-office stock truth",
    summary:
      "Counter sales, returns and online orders posting into the same inventory and accounting records the head office reports from.",
    modules: ["pos", "selling", "stock", "accounting", "crm", "reports"],
    features: [
      "Touch POS counters with barcode and scale support",
      "Shift opening, cash drawer and settlement closing",
      "Returns, exchanges and credit notes",
      "Shop-wise daily sales and cash summary",
      "Online order and stock synchronisation",
      "Consolidated multi-outlet reporting",
    ],
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    id: "finance",
    label: "Accounting & Finance",
    icon: Landmark,
    tagline: "Multi-currency books that close on time",
    summary:
      "A full general ledger with receivables, payables, tax, budgeting and payroll integration — designed for audits that take hours, not weeks.",
    modules: ["accounting", "landed", "workflow", "reports", "admin"],
    features: [
      "Multi-currency ledgers with exchange gain/loss",
      "Receivable / payable ageing and follow-up lists",
      "Tax templates and compliant invoice formats",
      "Budget vs. actual control per cost centre",
      "Bank reconciliation and payment entries",
      "Cash-flow, P&L, balance sheet and trial balance",
    ],
    tone: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    id: "services",
    label: "Services & Consulting",
    icon: Handshake,
    tagline: "Project revenue tied to effort delivered",
    summary:
      "Pipeline, projects, timesheets and retainer invoicing for service businesses that bill on time and materials.",
    modules: ["crm", "hr", "selling", "accounting", "workflow"],
    features: [
      "Lead-to-project conversion with deal tracking",
      "Timesheets feeding billable and non-billable hours",
      "Milestone and retainer billing",
      "Resource utilisation and margin per project",
      "Expense claims and reimbursement workflow",
      "Contract-to-cash reporting",
    ],
    tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    id: "healthcare",
    label: "Hospitals & Clinics",
    icon: Stethoscope,
    tagline: "One patient record from registration to final bill",
    summary:
      "Registration, OPD queue, clinical documentation, pharmacy, laboratory and inpatient billing — with the same ledger the finance team closes on.",
    modules: ["hospital", "stock", "accounting", "hr", "crm", "workflow", "reports"],
    features: [
      "Patient registration with unique medical record number",
      "OPD appointments, token queue and doctor schedules",
      "Clinical notes, diagnoses, prescriptions and service orders",
      "Pharmacy stock with batch and expiry control",
      "Laboratory orders, results and report delivery",
      "IPD admissions, bed allocation and discharge billing",
    ],
    tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "education",
    label: "Schools & Institutes",
    icon: GraduationCap,
    tagline: "Admissions to fee collection on a single student ledger",
    summary:
      "Enrol students, run attendance and timetables, publish results and collect fees — with concessions, arrears and reminders handled by the system.",
    modules: ["education", "accounting", "hr", "crm", "workflow", "reports"],
    features: [
      "Admission enquiries, enrolment and student records",
      "Class, section, timetable and teacher allocation",
      "Daily attendance and leave records",
      "Exams, grading schemes and printable report cards",
      "Fee schedules, invoices, concessions and fines",
      "Arrears ageing with automated reminder letters",
    ],
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "infrastructure",
    label: "Datacenter & Infrastructure",
    icon: HardDrive,
    tagline: "The hardware, hypervisor and analytics stack underneath",
    summary:
      "We size, host and support the platform itself — servers, storage, virtualization and the BI layer — so the ERP runs on infrastructure we are accountable for.",
    modules: ["datacenter", "virtualization", "bi", "admin", "reports"],
    features: [
      "On-premises, colocated or managed-cloud hosting",
      "Server, storage and rack capacity planning",
      "Hypervisor deployment, VM templates and live migration",
      "High availability, snapshots and disaster-recovery drills",
      "Power, cooling and redundancy design",
      "Power BI and Grafana stack hosted alongside the ERP",
    ],
    tone: "bg-stone-500/10 text-stone-600 dark:text-stone-400",
  },
];

/* ------------------------------------------------------------------ *
 * Business intelligence — the platforms we ship on top of ERP data.
 * ------------------------------------------------------------------ */

export interface BiPlatform {
  id: string;
  name: string;
  role: string;
  icon: LucideIcon;
  summary: string;
  features: string[];
  tone: string;
  /** Short "how it connects" line rendered under the card header. */
  connection: string;
}

export const BI_PLATFORMS: BiPlatform[] = [
  {
    id: "powerbi",
    name: "Microsoft Power BI",
    role: "Executive & financial analytics",
    icon: Gauge,
    summary:
      "A governed semantic model on top of ERPNext. Leadership gets board-ready dashboards on desktop and mobile; finance drills from any KPI through to the voucher behind it.",
    features: [
      "Star-schema model built from ERPNext SQL views and REST endpoints",
      "Executive dashboards: sales, purchase, margin, cash and stock ageing",
      "Drill-through from any number down to the source document",
      "Row-level security mirroring ERP roles and company access",
      "Scheduled refresh with email and Teams subscriptions",
      "Budget vs. actual, what-if costing and currency scenarios",
    ],
    connection: "ERPNext SQL views → Power BI dataset → scheduled refresh",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "grafana",
    name: "Grafana",
    role: "Real-time operations monitoring",
    icon: Activity,
    summary:
      "Live panels over a read replica of the ERP database. Operations see a stuck shipment, a lapsed LC or a queue backup while it is still fixable — not in the month-end review.",
    features: [
      "Real-time panels on shipment, LC and production milestones",
      "Threshold and anomaly alerting to email, Slack or Telegram",
      "Stock-out, credit-limit and SLA breach watchlists",
      "Platform health: database, workers, queues and sync lag",
      "Panels embeddable inside the ERP UI through signed URLs",
      "Time-series history retained beyond transactional tables",
    ],
    connection: "ERP database read replica → Grafana SQL data source",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
];

/** Source → model → visualise → act, rendered as a pipeline strip. */
export const BI_PIPELINE: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Database,
    title: "Extract",
    description: "Read-only SQL views and API endpoints — never writes into production tables.",
  },
  {
    icon: CircuitBoard,
    title: "Model",
    description: "A documented star schema with one agreed definition per metric.",
  },
  {
    icon: Eye,
    title: "Visualise",
    description: "Power BI for analysis, Grafana for live operations and alerting.",
  },
  {
    icon: Bell,
    title: "Act",
    description: "Scheduled digests, threshold alerts and follow-up tasks raised in the ERP.",
  },
];

/** Data-governance points shown beside the BI cards. */
export const BI_GOVERNANCE: { icon: LucideIcon; label: string }[] = [
  { icon: Lock, label: "Read-only replica for analytics" },
  { icon: ShieldCheck, label: "Access mirrored from ERP roles" },
  { icon: Server, label: "Virtualized, highly-available deployment" },
  { icon: Cloud, label: "Refresh schedules you control" },
  { icon: Route, label: "Data lineage on every metric" },
  { icon: Boxes, label: "No duplication of the system of record" },
];

/* ------------------------------------------------------------------ *
 * Illustrative chart data for the hero and BI previews. Static sample
 * numbers only — the page labels them as a preview.
 * ------------------------------------------------------------------ */

export const HERO_TREND: { month: string; shipments: number; margin: number }[] = [
  { month: "Jan", shipments: 42, margin: 18 },
  { month: "Feb", shipments: 51, margin: 21 },
  { month: "Mar", shipments: 47, margin: 19 },
  { month: "Apr", shipments: 63, margin: 24 },
  { month: "May", shipments: 58, margin: 22 },
  { month: "Jun", shipments: 72, margin: 27 },
];

export const HERO_KPIS: { label: string; value: string; delta: string; up: boolean }[] = [
  { label: "Open shipments", value: "24", delta: "+3", up: true },
  { label: "LCs in transit", value: "9", delta: "-1", up: false },
  { label: "Stock value", value: "$1.42M", delta: "+6.4%", up: true },
];

export const BI_MOCK_SERIES: { day: string; docs: number; alerts: number }[] = [
  { day: "Mon", docs: 118, alerts: 3 },
  { day: "Tue", docs: 132, alerts: 5 },
  { day: "Wed", docs: 127, alerts: 2 },
  { day: "Thu", docs: 146, alerts: 6 },
  { day: "Fri", docs: 158, alerts: 4 },
  { day: "Sat", docs: 96, alerts: 1 },
  { day: "Sun", docs: 41, alerts: 0 },
];
