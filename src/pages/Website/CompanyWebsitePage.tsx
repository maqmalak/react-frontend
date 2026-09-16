import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/layout/theme-provider";
import { AreaChart, BarChart } from "@/components/charts/charts";
import { cn } from "@/utils/cn";
import {
  BI_GOVERNANCE,
  BI_MOCK_SERIES,
  BI_PIPELINE,
  BI_PLATFORMS,
  COMPANY,
  HERO_KPIS,
  HERO_TREND,
  INDUSTRIES,
  MODULES,
} from "./website-data";

/** Anchor targets used by the sticky header. Kept at module scope so the
 * scroll-spy hook sees a stable dependency. */
const SECTIONS = [
  { id: "profile", label: "Company" },
  { id: "industries", label: "Industries" },
  { id: "modules", label: "Modules" },
  { id: "bi", label: "Business Intelligence" },
  { id: "contact", label: "Contact" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

/** All sections share this so the sticky header never covers a heading. */
const SECTION_CLASS = "scroll-mt-24";

/** Highlights whichever section currently occupies the upper viewport band. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      // Bias the band towards the top of the viewport so a section becomes
      // "current" as it scrolls in, rather than once it fills the screen.
      { rootMargin: "-96px 0px -60% 0px", threshold: [0.05, 0.3, 0.7] },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/** Sticky, glassy header with anchor navigation, theme toggle and a CTA. */
function SiteHeader({ active }: { active: string }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl dark:border-white/10 dark:bg-transparent">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <a href="#top" className="flex items-center gap-2.5" aria-label={COMPANY.legalName}>
          <Logo variant="full" className="h-9 w-auto" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active === section.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="primary" size="sm" onClick={() => navigate("/login")}>
            <Sparkles className="h-4 w-4" />
            Sign in to ERP
          </Button>
        </div>
      </div>
    </header>
  );
}
/** Shared section heading: small eyebrow, big title, muted description. */
function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary dark:border-white/10 dark:bg-white/5">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/**
 * Hero — brand promise on the left, a glassy snapshot panel on the right.
 * The chart is illustrative sample data (see website-data.ts) and is
 * labelled as a preview so it is never mistaken for live figures.
 */
function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden">
      {/* Ambient brand glow — echoes the app's dark-mode teal/indigo treatment. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-[-6rem] h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div className="animate-fade-in">
          <Badge variant="primary" dot className="px-3 py-1">
            {COMPANY.legalName}
          </Badge>

          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            One system of record for{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-sky-500 bg-clip-text text-transparent">
              trading, manufacturing, distribution, POS, hospitals and education
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {COMPANY.intro}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={() => navigate("/")}>
              Open the ERP
              <ArrowRight className="h-4 w-4" />
            </Button>
            <a
              href="#industries"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-6 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              See it by industry
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {COMPANY.stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="animate-fade-in border-primary/20 p-5 shadow-lg dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Executive snapshot</p>
              <p className="text-xs text-muted-foreground">Illustrative preview — not live data</p>
            </div>
            <Badge variant="info" dot>
              Power BI · Grafana
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {HERO_KPIS.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-border/70 bg-card/60 p-3 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-[11px] font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 flex items-baseline gap-1 text-lg font-semibold tabular-nums">
                  {kpi.value}
                  <span
                    className={cn(
                      "inline-flex items-center text-[11px] font-medium",
                      kpi.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500",
                    )}
                  >
                    {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {kpi.delta}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border/70 bg-card/40 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Shipments handled, last 6 months
            </p>
            <AreaChart
              data={HERO_TREND}
              xKey="month"
              series={[{ key: "shipments", label: "Shipments" }]}
              height={176}
            />
          </div>
        </Card>
      </div>
    </section>
  );
}

/** Company profile — who we are, what we run on, and how we operate. */
function ProfileSection() {
  return (
    <section
      id="profile"
      className={cn("border-t border-border/70 dark:border-white/10", SECTION_CLASS)}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        <SectionHeading
          eyebrow="Company profile"
          title={`Built by ${COMPANY.legalName}`}
          description={COMPANY.tagline}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="space-y-4">
              {COMPANY.about.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className="text-sm leading-relaxed text-muted-foreground sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {COMPANY.values.map((value) => {
                const Icon = value.icon;
                return (
                  <Card key={value.title} className="hover-lift p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">{value.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="h-fit p-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">At a glance</p>
            </div>

            <dl className="mt-4 space-y-3">
              {COMPANY.facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex gap-3 border-b border-dashed border-border/60 pb-2.5 last:border-0 last:pb-0 dark:border-white/10"
                >
                  <dt className="w-24 shrink-0 text-xs text-muted-foreground">{fact.label}</dt>
                  <dd className="text-xs font-medium leading-relaxed">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-primary/5 p-3 dark:bg-white/5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Implementation, data migration, user training and annual maintenance are delivered
                by our own consultants — the same team that builds the platform.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" />
              Deployed for trading, manufacturing, distribution, POS, hospitals and education.
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/**
 * Industry explorer — pick a vertical to see the modules it uses and the
 * features it gets. Module names are resolved from the MODULES catalogue so
 * the chips here can never drift from the module catalogue below.
 */
function IndustriesSection() {
  const [selected, setSelected] = useState(INDUSTRIES[0].id);
  const industry = INDUSTRIES.find((i) => i.id === selected) ?? INDUSTRIES[0];
  const modules = MODULES.filter((m) => industry.modules.includes(m.id));

  return (
    <section
      id="industries"
      className={cn("border-t border-border/70 bg-muted/30 dark:border-white/10 dark:bg-white/[0.02]", SECTION_CLASS)}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        <SectionHeading
          eyebrow="Industry"
          title="Modules and features, matched to how you actually work"
          description="Every implementation starts from the standard ERPNext core and adds the documents, controls and reports your vertical runs on. Pick an industry to see the exact scope — from trading houses and factories to hospitals, schools and datacenters."
        />

        <div className="mt-8 flex flex-wrap gap-2">
          {INDUSTRIES.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === industry.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground dark:border-white/10 dark:bg-white/5",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border/70 bg-card/60 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  industry.tone,
                )}
              >
                <industry.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{industry.label}</h3>
                <p className="text-sm text-muted-foreground">{industry.tagline}</p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              {modules.length} modules · {industry.features.length} key features
            </Badge>
          </div>

          <CardContent className="p-5">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {industry.summary}
                </p>

                <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modules enabled
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <span
                        key={module.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          module.tone,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {module.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  What you get
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {industry.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="leading-relaxed text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/** Full module & feature catalogue — the scope available in every deployment. */
function ModulesSection() {
  const totalFeatures = MODULES.reduce((sum, module) => sum + module.features.length, 0);

  return (
    <section id="modules" className={cn("border-t border-border/70 dark:border-white/10", SECTION_CLASS)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Modules & features"
            title="Everything included in the platform"
            description="Modules can be switched on per company and per role, so a trading house, a hospital and a school on the same instance each see only what concerns them."
          />
          <Badge variant="outline" className="w-fit px-3 py-1">
            {MODULES.length} modules · {totalFeatures} features
          </Badge>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.id} className="hover-lift flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", module.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <ChevronRight className="mt-2 h-4 w-4 text-muted-foreground" />
                </div>

                <h3 className="mt-4 text-sm font-semibold">{module.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {module.description}
                </p>

                <ul className="mt-4 space-y-1.5 border-t border-dashed border-border/60 pt-3 dark:border-white/10">
                  {module.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Business Intelligence — the two platforms we ship on top of ERP data.
 * Power BI covers governed analytical reporting; Grafana covers real-time
 * operational monitoring and alerting.
 */
function BiSection() {
  return (
    <section
      id="bi"
      className={cn(
        "border-t border-border/70 bg-muted/30 dark:border-white/10 dark:bg-white/[0.02]",
        SECTION_CLASS,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        <SectionHeading
          eyebrow="BI section"
          title="Analytics on top of the ledger — Power BI and Grafana"
          description="The ERP is the system of record; analytics never fork it. We publish read-only views and build two complementary layers on top: governed executive reporting in Microsoft Power BI, and live operational monitoring in Grafana."
        />

        {/* Source → model → visualise → act */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BI_PIPELINE.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="relative p-5">
                <span className="absolute right-4 top-4 text-xs font-semibold text-muted-foreground/60 tabular-nums">
                  0{index + 1}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {BI_PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            return (
              <Card key={platform.id} className="flex flex-col overflow-hidden">
                <div className="flex items-start gap-3 border-b border-border/70 bg-card/60 p-5 dark:border-white/10 dark:bg-white/5">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                      platform.tone,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight">{platform.name}</h3>
                    <p className="text-xs font-medium text-primary">{platform.role}</p>
                  </div>
                </div>

                <CardContent className="flex flex-1 flex-col p-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">{platform.summary}</p>

                  <ul className="mt-5 space-y-2">
                    {platform.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="leading-relaxed text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex items-start gap-2 rounded-lg bg-primary/5 p-3 dark:bg-white/5">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {platform.connection}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Governance + a live-looking operations preview */}
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-5">
            <p className="text-sm font-semibold">Governance built in</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Analytics access mirrors ERP access — nothing more, nothing less.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {BI_GOVERNANCE.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs dark:border-white/10"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Operations monitoring</p>
                <p className="text-xs text-muted-foreground">
                  Documents posted vs. alerts raised — illustrative preview
                </p>
              </div>
              <Badge variant="success" dot>
                Grafana
              </Badge>
            </div>
            <div className="mt-4">
              <BarChart
                data={BI_MOCK_SERIES}
                xKey="day"
                height={200}
                legend
                series={[
                  { key: "docs", label: "Documents posted" },
                  { key: "alerts", label: "Alerts raised" },
                ]}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="h-3.5 w-3.5 shrink-0 text-primary" />
              Threshold breaches notify email, Slack or Telegram within seconds.
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/** Contact / closing CTA — the conversion block at the end of the page. */
function ContactSection() {
  const navigate = useNavigate();
  const details = [
    { icon: MapPin, label: "Head office", value: COMPANY.contact.address },
    { icon: Phone, label: "Phone", value: COMPANY.contact.phone },
    { icon: Mail, label: "Email", value: COMPANY.contact.email },
    { icon: Globe, label: "Web", value: COMPANY.contact.website },
  ];

  return (
    <section id="contact" className={cn("border-t border-border/70 dark:border-white/10", SECTION_CLASS)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        <Card className="relative overflow-hidden border-primary/25 p-6 sm:p-10 dark:border-white/10">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <SectionHeading
                eyebrow="Contact us"
                title="Talk to the team that builds it"
                description="Tell us how you buy, produce and ship today. We will map it onto the platform and come back with a scoped implementation plan — modules, data migration, dashboards and timeline."
              />

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={() => navigate("/login")}>
                  Sign in to the ERP
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <a
                  href={`mailto:${COMPANY.contact.email}`}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-6 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Mail className="h-4 w-4" />
                  Request a demo
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {details.map((detail) => {
                const Icon = detail.icon;
                return (
                  <div
                    key={detail.label}
                    className="flex items-start gap-3 rounded-lg border border-border/70 bg-card/60 p-3.5 dark:border-white/10 dark:bg-white/5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">{detail.label}</p>
                      <p className="break-words text-sm font-medium">{detail.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/70 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Logo variant="full" className="h-8 w-auto" />
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()}</span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
          <a
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            ERP login
          </a>
        </nav>

        <p className="text-xs text-muted-foreground">
          Built on ERPNext / Frappe · Analytics by Power BI &amp; Grafana
        </p>
      </div>
    </footer>
  );
}

/**
 * Public company website for MicroMax Erp Pvt Ltd.
 *
 * Marketing page (no session required) covering the company profile, the
 * industries and modules we implement, and the Power BI / Grafana analytics
 * layer. All copy and data live in ./website-data.ts so the layout never has
 * to change to keep the content current.
 */
export function CompanyWebsitePage() {
  const active = useActiveSection(SECTION_IDS);

  return (
    <div
      id="top"
      className="min-h-screen bg-background text-foreground dark:bg-transparent"
    >
      <SiteHeader active={active} />
      <main>
        <HeroSection />
        <ProfileSection />
        <IndustriesSection />
        <ModulesSection />
        <BiSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
