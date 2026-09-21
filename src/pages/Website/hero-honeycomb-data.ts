import {
  ArrowLeftRight,
  Award,
  Box,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  Code,
  Copy,
  Crosshair,
  FileSignature,
  GanttChart,
  LayoutGrid,
  Leaf,
  List,
  NotebookPen,
  Package,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  SquarePlus,
  Tag,
  TriangleAlert,
  Truck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Hero honeycomb — data for the hex module ring, plug cells and role
 * faces. Ported from the hero of website-micromax.html; positions
 * (`pos`, `slot`) refer to lattice rules in hero-honeycomb.css.
 * ------------------------------------------------------------------ */

/** Modules the platform ships in total; the ring draws HEX_CELLS of them. */
export const HEX_MODULE_TOTAL = 190;

export interface HexCell {
  /** Lattice slot, e.g. "a1" -> `.hc-pos-a1`. */
  pos: string;
  icon: LucideIcon;
  title: string;
  sub: string;
  /** The two short lines shown on the flipped face. */
  back: [string, string];
}

export const HEX_CELLS: HexCell[] = [
  // Cluster A — planning
  { pos: "a1", icon: LayoutGrid, title: "Projects", sub: "portfolio", back: ["Portfolio", "& teams"] },
  { pos: "a2", icon: List, title: "BOQ", sub: "assemblies", back: ["Live", "totals"] },
  { pos: "a3", icon: GanttChart, title: "Schedules", sub: "4D gantt", back: ["Gantt", "& BOQ"] },
  { pos: "a4", icon: Users, title: "CRM", sub: "pipeline", back: ["Leads", "& deals"] },
  // Cluster B — measurement and cost
  { pos: "b1", icon: Crosshair, title: "Takeoff", sub: "auto", back: ["AI suggests", "you confirm"] },
  { pos: "b2", icon: Box, title: "CAD / BIM", sub: "DWG · IFC", back: ["DWG · IFC", "RVT · DGN"] },
  { pos: "b3", icon: Tag, title: "Costs", sub: "120k items", back: ["120k items", "vector search"] },
  { pos: "b4", icon: ShieldCheck, title: "Validation", sub: "compliance", back: ["Traffic-light", "report"] },
  { pos: "b5", icon: ClipboardCheck, title: "Tenders", sub: "bid packs", back: ["Compare", "bids"] },
  { pos: "b6", icon: Leaf, title: "Carbon", sub: "5D LCA", back: ["Embodied", "CO₂"] },
  { pos: "b8", icon: ArrowLeftRight, title: "Variations", sub: "change orders", back: ["Scope & cost", "changes"] },
  // Cluster C — site
  { pos: "c1", icon: FileSignature, title: "Contracts", sub: "awards", back: ["One", "audit trail"] },
  { pos: "c2", icon: Package, title: "Inventory", sub: "materials", back: ["Stock", "& orders"] },
  { pos: "c3", icon: TriangleAlert, title: "Safety", sub: "HSE", back: ["Incidents", "& toolbox"] },
  { pos: "c4", icon: Copy, title: "Documents", sub: "revisions", back: ["Revisions", "& diffs"] },
  { pos: "c5", icon: ClipboardList, title: "Site tasks", sub: "daily", back: ["Snags", "& photos"] },
  // Cluster D — operations and finance
  { pos: "d1", icon: NotebookPen, title: "Daily log", sub: "site diary", back: ["Diary", "& weather"] },
  { pos: "d6", icon: Truck, title: "Equipment", sub: "fleet", back: ["Fleet", "& plant"] },
  { pos: "d2", icon: Award, title: "Quality", sub: "QA · QC", back: ["Defects", "& audits"] },
  { pos: "d3", icon: Receipt, title: "Cashflow", sub: "invoices", back: ["Invoicing", "& budgets"] },
  { pos: "d4", icon: ChartColumn, title: "Reporting", sub: "exports", back: ["PDF · GAEB", "JSON · API"] },
  { pos: "d5", icon: User, title: "Users", sub: "RBAC · SSO", back: ["RBAC", "& SSO"] },
];

export interface HexPlug {
  n: 1 | 2 | 3;
  icon: LucideIcon;
  title: string;
  sub: string;
  label: string;
}

/** The green "bring your own module" column to the right of the city. */
export const HEX_PLUGS: HexPlug[] = [
  { n: 1, icon: SlidersHorizontal, title: "Custom", sub: "plug-in", label: "Custom module - plug in your own" },
  { n: 2, icon: SquarePlus, title: "Your module", sub: "add your own", label: "Add your own module - build it on the platform" },
  { n: 3, icon: Code, title: "Build", sub: "SDK · API", label: "Build a module with the SDK and API" },
];

/** Faces beside the brand mark, in the order they assemble outward from it. Slugs match assets/people/seg-<slug>.webp. */
export const HUB_PEOPLE: string[] = [
  "estimator",
  "construction-manager",
  "general-contractor",
  "architecture-engineering",
  "owner-client",
  "subcontractor",
  "procurement-manager",
  "mep-contractor",
  "hse-manager",
];

/** One face per module cluster: the role that cluster is for. */
export const RING_PEOPLE: { pos: "a" | "b" | "c" | "d"; slug: string }[] = [
  { pos: "a", slug: "scheduler-planner" },
  { pos: "b", slug: "bim-vdc" },
  { pos: "c", slug: "site-supervisor" },
  { pos: "d", slug: "commercial-manager" },
];

/** Empty hexes growing out of the hub (`--col`, `--row`, delay, opacity). */
export const AURA: { side: "top" | "bottom" | "left"; hexes: [number, number, string, number][] }[] = [
  {
    side: "top",
    hexes: [
      [0, 0, ".18s", 0.4],
      [-1, -1, ".28s", 0.32],
      [0, -2, ".34s", 0.42],
      [1, -3, ".42s", 0.44],
      [2, -2, ".46s", 0.34],
      [1, -5, ".50s", 0.46],
      [2, -6, ".60s", 0.48],
    ],
  },
  {
    side: "bottom",
    hexes: [
      [0, 0, ".18s", 0.4],
      [-1, 1, ".28s", 0.32],
      [0, 2, ".34s", 0.42],
      [1, 3, ".42s", 0.44],
      [2, 2, ".46s", 0.34],
      [1, 5, ".50s", 0.46],
      [2, 6, ".60s", 0.48],
    ],
  },
  {
    side: "left",
    hexes: [
      [0, 0, ".24s", 0.36],
      [0, -2, ".34s", 0.3],
      [0, 2, ".34s", 0.3],
    ],
  },
];
