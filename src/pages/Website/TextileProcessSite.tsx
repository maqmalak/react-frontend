import { useEffect, useState } from "react";
import { Cog, Disc3, Layers, Scissors, Shirt, Sprout, Truck, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ *
 * Textile process — site-styled variant. Same seven-stage flow as
 * TextileProcessDiagram (the infographic-styled version), rebuilt with
 * this page's own components: Card, lucide icons, the module `tone`
 * convention (bg-*-500/10 text-*-600 dark:text-*-400) and theme-aware
 * colors, so it sits consistently with the rest of the page instead of
 * carrying its own fixed look.
 * ------------------------------------------------------------------ */

interface SiteStage {
  n: number;
  label: string;
  sub: string;
  icon: LucideIcon;
  tone: string;
}

const STAGES: SiteStage[] = [
  { n: 1, label: "Raw Material", sub: "Cotton & fibre", icon: Sprout, tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { n: 2, label: "Collection", sub: "Of raw materials", icon: Truck, tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { n: 3, label: "Processing", sub: "Of raw materials", icon: Cog, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { n: 4, label: "Threads", sub: "Spun & dyed", icon: Disc3, tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { n: 5, label: "Fabric Manufacture", sub: "Weaving & folding", icon: Layers, tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { n: 6, label: "Tailoring", sub: "Cut & sewn", icon: Scissors, tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { n: 7, label: "Ready-Made Clothes", sub: "Garment manufacturing", icon: Shirt, tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
];

const CYCLE_MS = 900;

/** Animated seven-stage textile process flow, built from this page's own Card / icon / colour system. */
export function TextileProcessSite() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setActive((a) => (a + 1) % STAGES.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mt-2.5">
      {/* Single row, seven text labels — needs more horizontal room than the infographic
          card's one graphic, so it gets its own cap rather than matching that width. */}
      <Card className="max-w-[700px] overflow-hidden p-3 sm:p-4">
        <div className="flex flex-wrap items-start gap-x-0.5 gap-y-4 sm:flex-nowrap">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const isActive = i === active;
            return (
              <div key={stage.n} className="flex flex-1 basis-[5.5rem] items-start sm:basis-0">
                <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <div className="relative">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                        stage.tone,
                        isActive && "ring-2 ring-primary ring-offset-1 ring-offset-card scale-110",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                      {stage.n}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold leading-tight">{stage.label}</p>
                  <p className="mt-0.5 text-[8px] uppercase leading-tight tracking-wide text-muted-foreground">{stage.sub}</p>
                </div>

                {stage.n < STAGES.length && (
                  <div className="relative mt-4 hidden h-px flex-1 shrink-0 bg-border sm:block dark:bg-white/10">
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out",
                        i < active ? "w-full" : i === active ? "w-1/2" : "w-0",
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
