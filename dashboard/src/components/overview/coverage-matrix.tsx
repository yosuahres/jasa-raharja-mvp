import { ChartEmpty } from "@/components/charts/chart-kit";
import { TierBadge, TierDot } from "@/components/tier-badge";
import type { Tier } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export type CoverageCell = { columnId: string; tier: Tier | null; hospital?: string };

export type CoverageRow = { city: string; hospitals: number; cells: CoverageCell[] };

export type CoverageColumn = { id: string; name: string };

// A city "needs a partner" for a kind of service when nobody there offers it, or only at Tier C.
const isGap = (cell: CoverageCell) => cell.tier === null || cell.tier === "C";

/** Best tier available per city × kind of service. Gaps are what drive new PKS partnerships. Scrolls edge to edge in a card. */
export function CoverageMatrix({ columns, rows }: { columns: CoverageColumn[]; rows: CoverageRow[] }) {
  if (rows.length === 0 || columns.length === 0) {
    return <ChartEmpty shape="rows" title="Belum ada data" />;
  }

  return (
    <div>
      <div className="-mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-[42rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background pr-3 pb-2 text-left align-bottom text-xs font-medium text-muted-foreground">Kota</th>
              {columns.map((c) => (
                <th key={c.id} className="w-24 px-0.5 pb-2 text-left align-bottom font-normal">
                  <span className="block text-xs leading-snug font-medium">{c.name}</span>
                </th>
              ))}
              <th className="pb-2 pl-3 text-right align-bottom text-xs font-medium text-muted-foreground">Celah</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const gaps = row.cells.filter(isGap).length;
              return (
                <tr key={row.city}>
                  <th scope="row" className="sticky left-0 z-10 bg-background py-0.5 pr-3 text-left font-normal whitespace-nowrap">
                    <span className="block font-medium">{row.city}</span>
                    <span className="block text-xs text-muted-foreground">{row.hospitals} RS</span>
                  </th>
                  {row.cells.map((cell) => (
                    <td key={cell.columnId} className="p-0.5">
                      {cell.tier ? (
                        // Native title keeps the dense grid readable while still naming the hospital.
                        <span title={`Tier ${cell.tier} · ${cell.hospital}`} className="block">
                          <TierBadge tier={cell.tier} className="flex h-8 w-full justify-center font-medium" />
                        </span>
                      ) : (
                        <span
                          title="Belum ada RS di kota ini dengan layanan ini"
                          className="flex h-8 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground"
                        >
                          —
                        </span>
                      )}
                    </td>
                  ))}
                  <td className={cn("pl-3 text-right font-medium tabular-nums", gaps ? "text-tier-c-ink" : "text-muted-foreground")}>{gaps}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {(["A", "B", "C"] as Tier[]).map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <TierDot tier={t} />
            Tier {t} terbaik
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-[3px] border border-dashed border-muted-foreground/60" />
          Belum ada RS
        </li>
      </ul>
    </div>
  );
}
