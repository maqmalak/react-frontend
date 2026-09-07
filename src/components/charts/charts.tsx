import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart as RCBar,
  Bar,
  LineChart as RCLine,
  Line,
  AreaChart as RCArea,
  Area,
  PieChart as RCPie,
  Pie,
  Sector,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatMoney, formatNumber } from "@/utils/currency";

const CHART_COLORS = [
  "hsl(221 83% 53%)", // primary blue
  "hsl(160 84% 39%)", // emerald
  "hsl(35 92% 50%)", // amber
  "hsl(262 83% 58%)", // violet
  "hsl(351 95% 59%)", // rose
  "hsl(199 89% 48%)", // sky
];

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium">{label ?? ""}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.payload?.color }} />
          <span>{entry.name}:</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatter ? formatter(entry.value) : formatNumber(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface ChartProps<T = Record<string, any>> {
  data: T[];
  /** key -> label mapping for series */
  series: { key: string; label: string; color?: string }[];
  xKey: string;
  height?: number;
  money?: boolean;
  /** Currency code for `money` formatting. Defaults to USD. */
  currency?: string;
  legend?: boolean;
  /**
   * BarChart only: a field on each data row holding a CSS color for that
   * row's bar (e.g. green for a positive value, rose for negative) —
   * overrides the series' own flat color per-point. Ignored with more than
   * one series, where a single color-per-category wouldn't be meaningful.
   */
  colorKey?: string;
}

function axisFormatter(money: boolean, currency: string, v: number) {
  return money ? formatMoney(v, currency, { compact: true }) : formatNumber(v, 0);
}

export function BarChart({ data, series, xKey, height = 260, money, currency = "USD", legend, colorKey }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RCBar data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v: number) => axisFormatter(!!money, currency, v)}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltip formatter={money ? (v: number) => formatMoney(v, currency) : undefined} />}
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
        />
        {legend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={40}>
            {colorKey && series.length === 1 && data.map((d, di) => <Cell key={di} fill={(d as any)[colorKey] ?? s.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        ))}
      </RCBar>
    </ResponsiveContainer>
  );
}

export function LineChart({ data, series, xKey, height = 260, money, currency = "USD", legend }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RCLine data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v: number) => axisFormatter(!!money, currency, v)} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip formatter={money ? (v: number) => formatMoney(v, currency) : undefined} />} />
        {legend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </RCLine>
    </ResponsiveContainer>
  );
}
export function AreaChart({ data, series, xKey, height = 260, money, currency = "USD" }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RCArea data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v: number) => axisFormatter(!!money, currency, v)} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip formatter={money ? (v: number) => formatMoney(v, currency) : undefined} />} />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#grad-${s.key})`}
            strokeWidth={2}
          />
        ))}
      </RCArea>
    </ResponsiveContainer>
  );
}

export interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  money?: boolean;
  /** Currency code for `money` formatting (center label + tooltip). Defaults to USD. */
  currency?: string;
  innerRadius?: number | string;
  legend?: boolean;
}

/** Hover "pop": the active wedge grows outward with rounded caps; a thin ring
 * gap is stroked in the surface color so it reads as lifted, not just resized. */
function renderActiveSlice(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 10}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={8}
      stroke="hsl(var(--card))"
      strokeWidth={2}
    />
  );
}

export function PieChart({ data, height = 260, money, currency = "USD", innerRadius = 0, legend = true }: PieChartProps) {
  const safeData = data.filter((d) => d.value !== 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isDonut = innerRadius !== 0 && innerRadius !== "0";
  const total = safeData.reduce((s, d) => s + d.value, 0);
  const fmt = (v: number) => (money ? formatMoney(v, currency) : formatNumber(v));
  const active = activeIndex != null ? safeData[activeIndex] : undefined;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RCPie>
        <Pie
          data={safeData}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="88%"
          paddingAngle={3}
          cornerRadius={6}
          stroke="hsl(var(--card))"
          strokeWidth={2}
          activeIndex={activeIndex ?? undefined}
          activeShape={renderActiveSlice}
          onMouseEnter={(_, i) => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
          animationDuration={400}
        >
          {safeData.map((d, i) => (
            <Cell
              key={i}
              fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              opacity={activeIndex == null || activeIndex === i ? 1 : 0.35}
              style={{ transition: "opacity 200ms ease" }}
            />
          ))}
        </Pie>
        {isDonut && (
          <>
            <text x="50%" y="50%" dy={active ? -10 : -4} textAnchor="middle" className="fill-foreground text-lg font-bold">
              {fmt(active ? active.value : total)}
            </text>
            <text x="50%" y="50%" dy={14} textAnchor="middle" className="fill-muted-foreground text-xs">
              {active ? active.label : "Total"}
            </text>
            {active && total > 0 && (
              <text x="50%" y="50%" dy={30} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {Math.round((active.value / total) * 100)}%
              </text>
            )}
          </>
        )}
        <Tooltip content={<ChartTooltip formatter={money ? (v: number) => formatMoney(v, currency) : undefined} />} />
        {legend && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span className="text-foreground">{value}</span>} />}
      </RCPie>
    </ResponsiveContainer>
  );
}

export function DonutChart(props: PieChartProps) {
  return <PieChart {...props} innerRadius={props.innerRadius ?? "62%"} />;
}

export { CHART_COLORS };