"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RESIZE_DEBOUNCE_MS } from "@/components/charts/chart-kit";
import type { Tier } from "@/lib/data/types";
import { formatRange } from "@/lib/format";

export type PriceRangeRow = { name: string; tier: Tier; min: number; max: number };

const TIER_COLOR: Record<Tier, string> = { A: "var(--tier-a)", B: "var(--tier-b)", C: "var(--tier-c)" };

const toJuta = (value: number) => `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;

/** Floating bars from min to max tariff, one per hospital, with the median marked. */
export function PriceRangeChart({ data, median }: { data: PriceRangeRow[]; median: number }) {
  const rows = data.map((d) => ({ ...d, range: [d.min, d.max] as [number, number] }));

  return (
    <div style={{ height: Math.max(160, rows.length * 34 + 40) }}>
      <ResponsiveContainer width="100%" height="100%" debounce={RESIZE_DEBOUNCE_MS}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 16 }} barSize={14}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            domain={["dataMin - 1000000", "dataMax + 1000000"]}
            tickFormatter={toJuta}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
          />
          <YAxis type="category" dataKey="name" width={160} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
          <ReferenceLine
            x={median}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            label={{ value: `Median ${toJuta(median)}`, position: "top", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as PriceRangeRow;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-popover-foreground">{row.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
                    <span className="size-2 rounded-sm" style={{ background: TIER_COLOR[row.tier] }} />
                    Tier {row.tier} · <span className="tabular-nums text-popover-foreground">{formatRange(row.min, row.max)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="range" radius={4}>
            {rows.map((row) => (
              <Cell key={row.name} fill={TIER_COLOR[row.tier]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
