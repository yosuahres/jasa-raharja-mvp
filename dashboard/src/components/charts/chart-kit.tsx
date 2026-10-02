import { ChevronDown, FileUp } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Resize charts once their container settles (e.g. after the sidebar animates) instead of on every frame. */
export const RESIZE_DEBOUNCE_MS = 100;

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  fontSize: 12,
  stroke: "var(--muted-foreground)",
} as const;

/** A hollow ring marker, used in legends and tooltips so they match the chart's active dots. */
export function RingDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full border-[2.5px]", className)} style={{ borderColor: color }} />;
}

export function Legend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 text-sm", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** The y-axis unit, above its ticks: "↑ Skor". */
export function AxisCaption({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs text-muted-foreground">↑ {children}</p>;
}

export function TooltipCard({
  title,
  rows,
}: {
  title: React.ReactNode;
  rows: { label: string; value: React.ReactNode; color?: string }[];
}) {
  return (
    <div className="min-w-48 rounded-xl bg-popover px-4 py-3 text-sm text-popover-foreground shadow-[0_8px_24px_rgb(0_0_0/0.08),0_0_0_1px_var(--border)]">
      <p className="mb-2 font-medium">{title}</p>
      <ul className="grid gap-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            {row.color && <RingDot color={row.color} />}
            <span>{row.label}</span>
            <span className="ml-auto pl-6 tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A compact select styled as a soft pill, for per-chart filters. */
export function PillSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 max-w-48 appearance-none truncate rounded-lg bg-muted py-1 pr-7 pl-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

/** Drops the "RS"/"RSUD" prefix and keeps the distinctive first word, for tight axis ticks. */
export const shortHospitalName = (name: string) => name.replace(/^(RSUD|RS)\s+/, "").split(" ")[0];

export type GhostShape = "line" | "bars" | "scatter" | "rows";

// Fixed positions (%) so the ghost renders identically on server and client.
const GHOST_DOTS = [
  [12, 70], [20, 52], [27, 64], [34, 38], [41, 58], [48, 30], [55, 46], [62, 26], [70, 40], [78, 22], [86, 34],
] as const;
const GHOST_BARS = [18, 34, 58, 82, 66, 44, 26, 12];
const GHOST_ROWS = [[5, 3, 1], [3, 4, 2], [6, 2, 1], [2, 3, 4]] as const;

/** A faint outline of the chart that would be here, so an empty panel still reads as a chart. */
function ChartGhost({ shape }: { shape: GhostShape }) {
  if (shape === "rows") {
    return (
      <div aria-hidden className="absolute inset-x-0 top-2 grid gap-5">
        {GHOST_ROWS.map((row, index) => (
          <div key={index}>
            <span className="mb-2 block h-2 rounded-full bg-muted" style={{ width: `${40 + index * 12}%` }} />
            <span className="flex h-2 gap-0.5">
              {row.map((grow, segment) => (
                <span key={segment} className="h-full rounded-[2px] bg-muted first:rounded-l-full last:rounded-r-full" style={{ flexGrow: grow }} />
              ))}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden className="absolute inset-0">
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[20, 45, 70, 95].map((y) => (
          <line key={y} x1={0} x2={100} y1={y} y2={y} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
        ))}
        {shape === "line" && (
          <path
            d="M0 30 C 15 26, 25 40, 40 42 S 65 58, 80 64 S 95 78, 100 80"
            fill="none"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.3}
            strokeWidth={2}
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shape === "bars" &&
          GHOST_BARS.map((height, index) => (
            <rect key={index} x={index * 12.5 + 2.5} width={7.5} y={95 - height} height={height} rx={1} fill="var(--muted)" />
          ))}
      </svg>
      {shape === "scatter" &&
        GHOST_DOTS.map(([x, y]) => (
          <span key={`${x}-${y}`} className="absolute size-2.5 -translate-1/2 rounded-full bg-muted" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
    </div>
  );
}

/** Stands in for a chart with nothing to plot: the chart's outline, what's missing, and where to fix it. */
export function ChartEmpty({
  shape,
  title,
  description,
  className,
}: {
  shape: GhostShape;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative grid h-56 place-items-center overflow-hidden", className)}>
      <ChartGhost shape={shape} />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(closest-side,var(--background)_45%,transparent)]" />
      <div className="relative flex max-w-64 flex-col items-center px-4 text-center">
        <p className="text-sm font-medium text-balance">{title}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>}
        <Link
          href="/input"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-85"
        >
          <FileUp className="size-3.5" />
          Input data
        </Link>
      </div>
    </div>
  );
}
