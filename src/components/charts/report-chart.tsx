/**
 * Report chart for the report centre: Bar / Line / Area / Pie / Donut, a least-squares trend line, series and slice
 * colours / visibility (remembered per report in this browser) and "pizza slice" pies that lift on hover.
 */
import { Check, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { formatMoney } from "@/utils/currency";
import { cn } from "@/utils/cn";

const money = (v: number, o: { compact?: boolean } = {}) => formatMoney(v, undefined, { compact: o.compact });

/** True while the app is in dark mode (follows the theme switch). */
function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const ob = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => ob.disconnect();
  }, []);
  return { dark };
}
const useTheme = useDark;

export const axisShort = (v: number) => {
  const a = Math.abs(v);
  const f = (n: number) => (n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, ""));
  return a >= 1e7 ? `${f(v / 1e7)}Cr` : a >= 1e5 ? `${f(v / 1e5)}L` : a >= 1e3 ? `${f(v / 1e3)}K` : String(v);
};


export function useChartTheme(dark: boolean) {
  return { axis: dark ? "#94a3b8" : "#64748b", grid: dark ? "rgba(148,163,184,.12)" : "rgba(100,116,139,.15)", tick: { fontSize: 11 } };
}


export function ChartTip({ active, payload, label, fmt = (v: number) => money(v) }: TooltipProps<number, string> & { fmt?: (v: number, key: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-xl border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full" style={{ background: p.color ?? (p.payload as { fill?: string })?.fill }} />{p.name}</span>
          <span className="font-semibold tabular-nums text-foreground">{fmt(Number(p.value ?? 0), String(p.dataKey))}</span>
        </p>
      ))}
    </div>
  );
}


export interface SeriesStyle { from: string; to: string }

export const GRADIENTS: { name: string; from: string; to: string }[] = [
  { name: "Emerald", from: "#34d399", to: "#059669" }, { name: "Teal", from: "#2dd4bf", to: "#0f766e" }, { name: "Sky", from: "#7dd3fc", to: "#0284c7" },
  { name: "Indigo", from: "#a5b4fc", to: "#6366f1" }, { name: "Violet", from: "#c4b5fd", to: "#7c3aed" }, { name: "Amber", from: "#fcd34d", to: "#d97706" },
  { name: "Orange", from: "#fdba74", to: "#ea580c" }, { name: "Rose", from: "#fda4af", to: "#e11d48" }, { name: "Slate", from: "#cbd5e1", to: "#475569" },
  { name: "Lime", from: "#bef264", to: "#4d7c0f" },
];


export function useSeriesPrefs(storageKey: string, defaults: Record<string, SeriesStyle>) {
  const load = (): { colors: Record<string, SeriesStyle>; hidden: string[] } => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const v = JSON.parse(raw) as { colors?: Record<string, SeriesStyle>; hidden?: string[] };
        return { colors: { ...defaults, ...(v.colors ?? {}) }, hidden: v.hidden ?? [] };
      }
    } catch {
      /* storage blocked or bad JSON — use defaults */
    }
    return { colors: defaults, hidden: [] };
  };
  const [state, setState] = useState(load);
  const save = (next: typeof state) => {
    setState(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* not remembered */
    }
  };
  return {
    colors: state.colors,
    hidden: new Set(state.hidden),
    toggle: (key: string) => save({ ...state, hidden: state.hidden.includes(key) ? state.hidden.filter((k) => k !== key) : [...state.hidden, key] }),
    setHidden: (keys: string[]) => save({ ...state, hidden: keys }),
    setColor: (key: string, style: SeriesStyle) => save({ ...state, colors: { ...state.colors, [key]: style } }),
    reset: () => save({ colors: defaults, hidden: [] }),
    customised: state.hidden.length > 0 || Object.keys(defaults).some((k) => state.colors[k]?.from !== defaults[k].from),
  };
}


export function SeriesLegend({ series, colors, hidden, onToggle, onColor, onReset, customised, onSetHidden }: {
  series: { key: string; label: string; value?: string }[]; colors: Record<string, SeriesStyle>; hidden: Set<string>;
  onToggle: (key: string) => void; onColor: (key: string, s: SeriesStyle) => void; onReset?: () => void; customised?: boolean;
  /** Enables the All / None buttons. */
  onSetHidden?: (keys: string[]) => void;
}) {
  const [picking, setPicking] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!picking) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setPicking(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [picking]);
  return (
    <div ref={box} className="flex flex-wrap items-center gap-1.5">
      {series.map((sr) => {
        const off = hidden.has(sr.key);
        const c = colors[sr.key];
        return (
          <div key={sr.key} className={cn("relative flex items-center rounded-full border text-xs transition", off ? "border-dashed opacity-50" : "bg-card shadow-sm",
            picking === sr.key && "ring-2 ring-ring/50")}>
            <button type="button" title="Change colour" aria-label={`Change ${sr.label} colour`} onClick={() => setPicking(picking === sr.key ? null : sr.key)}
              className="ml-1 grid size-5 place-items-center rounded-full hover:ring-2 hover:ring-ring/40">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }} />
            </button>
            <button type="button" aria-pressed={!off} title={off ? "Show" : "Hide"} onClick={() => onToggle(sr.key)}
              className={cn("flex items-center gap-1.5 py-1 pl-1 pr-2.5", off && "line-through")}>
              <span className="font-medium text-foreground">{sr.label}</span>
              {sr.value && <span className="tabular-nums text-muted-foreground">{sr.value}</span>}
            </button>
            {picking === sr.key && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-60 rounded-xl border bg-popover p-2 opacity-100 shadow-xl" role="dialog" aria-label={`${sr.label} colour`}>
                <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{sr.label} colour</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {GRADIENTS.map((g) => (
                    <button key={g.name} type="button" title={g.name} onClick={() => { onColor(sr.key, { from: g.from, to: g.to }); setPicking(null); }}
                      className={cn("grid h-8 place-items-center rounded-lg ring-offset-2 ring-offset-popover", c.from === g.from && "ring-2 ring-ring")}
                      style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                      {c.from === g.from && <Check className="size-3.5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {onSetHidden && series.length > 1 && <AllNone allOn={hidden.size === 0} noneOn={series.every((x) => hidden.has(x.key))} onAll={() => onSetHidden([])} onNone={() => onSetHidden(series.map((x) => x.key))} />}
      {customised && onReset && <button type="button" onClick={onReset} className="ml-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline">Reset</button>}
    </div>
  );
}


function AllNone({ allOn, noneOn, onAll, onNone }: { allOn: boolean; noneOn: boolean; onAll: () => void; onNone: () => void }) {
  const b = (on: boolean) => cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium transition", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground");
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Show series">
      <button type="button" className={b(allOn)} onClick={onAll}>All</button>
      <button type="button" className={b(noneOn)} onClick={onNone}>None</button>
    </span>
  );
}


type ChartType = "bar" | "line" | "area" | "pie" | "donut";
const TYPES: [ChartType, string][] = [["bar", "Bar"], ["line", "Line"], ["area", "Area"], ["pie", "Pie"], ["donut", "Donut"]];

/** Least-squares straight line through a series (for the trend overlay). */
function trend(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values;
  const xs = values.map((_, i) => i), mx = (n - 1) / 2, my = values.reduce((a, v) => a + v, 0) / n;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (values[i] - my), 0) / Math.max(xs.reduce((a, x) => a + (x - mx) ** 2, 0), 1e-9);
  return xs.map((x) => my + slope * (x - mx));
}

const defaults = (keys: string[]): Record<string, SeriesStyle> =>
  Object.fromEntries(keys.map((k, i) => [k, { from: GRADIENTS[i % GRADIENTS.length].from, to: GRADIENTS[i % GRADIENTS.length].to }]));

export function ReportChart({ report, chart }: { report: string; chart: { rows: Record<string, string | number>[]; series: string[]; type: string; fromTable: boolean } }) {
  const { dark } = useTheme();
  const t = useChartTheme(dark);
  const [type, setType] = useState<ChartType>(chart.type === "line" ? "line" : chart.type === "pie" ? "pie" : chart.type === "donut" ? "donut" : "bar");
  const [showTrend, setShowTrend] = useState(false);
  const [slice, setSlice] = useState(chart.series[0] ?? "");
  const [hover, setHover] = useState<number | null>(null);
  // series colours / visibility per report, and slice colours / visibility for pie & donut — remembered in this browser
  const prefs = useSeriesPrefs(`report-chart:${report}`, defaults(chart.series));
  const labels = chart.rows.map((r) => String(r.label));
  const slicePrefs = useSeriesPrefs(`report-pie:${report}`, defaults(labels));
  const colorOf = (s: string) => prefs.colors[s] ?? defaults([s])[s];
  const visible = chart.series.filter((s) => !prefs.hidden.has(s));
  const trendKey = visible[0] ?? chart.series[0];
  const rows = useMemo(() => {
    if (!showTrend || !trendKey) return chart.rows;
    const line = trend(chart.rows.map((r) => Number(r[trendKey] ?? 0)));
    return chart.rows.map((r, i) => ({ ...r, __trend: Math.round(line[i]) }));
  }, [chart, showTrend, trendKey]);
  const pieData = chart.rows.map((r) => ({ name: String(r.label), value: Math.max(0, Number(r[slice] ?? 0)) }))
    .filter((d) => d.value > 0 && !slicePrefs.hidden.has(d.name))
    .map((d) => ({ ...d, color: (slicePrefs.colors[d.name] ?? defaults([d.name])[d.name]).to }));
  const pieTotal = pieData.reduce((a, d) => a + d.value, 0);
  const gid = (s: string) => s.replace(/[^a-z0-9]/gi, "_");
  const axes = (
    <>
      <defs>
        {chart.series.map((s) => (
          <linearGradient key={`${s}-${colorOf(s).from}`} id={`rg-${gid(s)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorOf(s).to} stopOpacity={type === "area" ? 0.45 : 1} />
            <stop offset="100%" stopColor={colorOf(s).from} stopOpacity={type === "area" ? 0.05 : 0.85} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid vertical={false} stroke={t.grid} />
      <XAxis dataKey="label" tick={t.tick} stroke={t.axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
      <YAxis tickFormatter={axisShort} tick={t.tick} stroke={t.axis} tickLine={false} axisLine={false} width={52} />
      <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
    </>
  );
  const trendLine = showTrend && <Line key="__trend" dataKey="__trend" name={`Trend (${trendKey})`} stroke="hsl(var(--foreground))" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="6 5" dot={false} type="linear" legendType="plainline" />;

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-muted/40 p-0.5">
          {TYPES.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setType(k)}
              className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition", type === k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
        {type !== "pie" && type !== "donut" ? (
          <button type="button" onClick={() => setShowTrend((v) => !v)} aria-pressed={showTrend}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition", showTrend ? "border-primary/50 bg-primary/10 text-primary" : "hover:bg-muted")}>
            <TrendingUp className="size-3.5" /> Trend line
          </button>
        ) : chart.series.length > 1 && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Slice by
            <select className="field h-8 w-48 text-xs" value={slice} onChange={(e) => setSlice(e.target.value)}>{chart.series.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        )}
        {chart.fromTable && <span className="ml-auto text-[11px] text-muted-foreground">Built from the table{chart.rows.length >= 40 ? " (first 40 rows)" : ""}</span>}
      </div>
      {type === "pie" || type === "donut" ? (
        <SeriesLegend colors={Object.fromEntries(labels.map((l) => [l, slicePrefs.colors[l] ?? defaults([l])[l]]))} hidden={slicePrefs.hidden}
          onToggle={slicePrefs.toggle} onColor={slicePrefs.setColor} onReset={slicePrefs.reset} customised={slicePrefs.customised} onSetHidden={slicePrefs.setHidden}
          series={labels.slice(0, 24).map((l) => ({ key: l, label: l }))} />
      ) : (
        <SeriesLegend colors={Object.fromEntries(chart.series.map((s) => [s, colorOf(s)]))} hidden={prefs.hidden}
          onToggle={prefs.toggle} onColor={prefs.setColor} onReset={prefs.reset} customised={prefs.customised} onSetHidden={prefs.setHidden}
          series={chart.series.map((s) => ({ key: s, label: s, value: money(chart.rows.reduce((a, r) => a + Number(r[s] ?? 0), 0), { compact: true }) }))} />
      )}
      <div className="relative h-[420px]">
        {type === "donut" && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
            {hover !== null && pieData[hover] ? (
              <>
                <span className="mb-1 h-2 w-8 rounded-full" style={{ background: pieData[hover].color }} />
                <span className="max-w-[140px] truncate text-xs font-medium text-muted-foreground">{pieData[hover].name}</span>
                <span className="text-xl font-bold tabular-nums">{money(pieData[hover].value, { compact: true })}</span>
                <span className="text-xs font-semibold" style={{ color: pieData[hover].color }}>{pieTotal ? ((pieData[hover].value * 100) / pieTotal).toFixed(1) : 0}%</span>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-muted-foreground">Total {slice}</span>
                <span className="text-xl font-bold tabular-nums">{money(pieTotal, { compact: true })}</span>
                <span className="text-xs text-muted-foreground">{pieData.length} items</span>
              </>
            )}
          </div>
        )}
        <ResponsiveContainer>
          {type === "pie" || type === "donut" ? (
            <PieChart>
              {type === "pie" && <Tooltip formatter={(v: number) => [`${money(v, { compact: true })} · ${pieTotal ? ((v * 100) / pieTotal).toFixed(1) : 0}%`, slice]} />}
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={type === "donut" ? "52%" : 0} outerRadius="78%" paddingAngle={2}
                stroke="hsl(var(--card))" strokeWidth={2} isAnimationActive={false}
                activeIndex={pieData.map((_, i) => i)} activeShape={(p: unknown) => { const sp = p as SliceProps; const on = hover !== null && pieData[hover]?.name === sp.name; return <PizzaSlice {...sp} lifted={on} dim={hover !== null && !on} />; }}
                onMouseEnter={(_: unknown, i: number) => setHover(i)} onMouseLeave={() => setHover(null)}
                label={({ percent }: { percent: number }) => (percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "")} labelLine={false}>
                {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
            </PieChart>
          ) : type === "line" ? (
            <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              {axes}
              {visible.map((s) => <Line key={s} dataKey={s} stroke={colorOf(s).to} strokeWidth={2.5} dot={{ r: 2.5, fill: colorOf(s).to }} type="monotone" />)}
              {trendLine}
            </ComposedChart>
          ) : type === "area" ? (
            <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              {axes}
              {visible.map((s) => <Area key={s} dataKey={s} stroke={colorOf(s).to} fill={`url(#rg-${gid(s)})`} strokeWidth={2} type="monotone" />)}
              {trendLine}
            </ComposedChart>
          ) : (
            <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              {axes}
              {visible.map((s) => <Bar key={s} dataKey={s} fill={`url(#rg-${gid(s)})`} radius={[6, 6, 0, 0]} maxBarSize={40} />)}
              {trendLine}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
      {(type === "pie" || type === "donut") && (
        <p className="text-center text-xs text-muted-foreground">
          {hover !== null && pieData[hover]
            ? <><b className="text-foreground">{pieData[hover].name}</b> · {money(pieData[hover].value, { compact: true })} · {pieTotal ? ((pieData[hover].value * 100) / pieTotal).toFixed(1) : 0}%</>
            : <>{slice} · total {money(pieTotal, { compact: true })} across {pieData.length} items — hover a slice</>}
        </p>
      )}
    </div>
  );
}

interface SliceProps { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string; name: string }

/** A pizza slice: every slice sits a little out from the centre. On hover the slice glides further out, grows, gets a
 *  halo ring in its colour, and the other slices fade back. */
function PizzaSlice({ cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, lifted, dim }: SliceProps & { lifted: boolean; dim: boolean }) {
  const r = Math.PI / 180, off = lifted ? 18 : 6;
  const dx = Math.cos(-midAngle * r) * off, dy = Math.sin(-midAngle * r) * off;
  return (
    <g>
    {/* invisible hit area at the slice's resting place (stretched to cover where it moves), so the pulled-out slice doesn't slip from under the pointer and flicker */}
    <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 28} startAngle={startAngle} endAngle={endAngle} fill="transparent" />
    <g style={{
      pointerEvents: "none",
      transform: `translate(${dx}px, ${dy}px) scale(${lifted ? 1.05 : 1})`, transformOrigin: `${cx}px ${cy}px`,
      transition: "transform 220ms cubic-bezier(.2,.8,.3,1.2), opacity 180ms ease, filter 180ms ease",
      opacity: dim ? 0.35 : 1, cursor: "pointer",
      filter: lifted ? `drop-shadow(0 8px 14px rgb(0 0 0 / 0.28)) saturate(1.15)` : "drop-shadow(0 2px 3px rgb(0 0 0 / 0.12))",
    }}>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle}
        fill={fill} stroke="hsl(var(--card))" strokeWidth={2} cornerRadius={innerRadius ? 4 : 3} />
      {lifted && (
        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 4} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle}
          fill={fill} opacity={0.55} cornerRadius={2} />
      )}
    </g>
    </g>
  );
}

