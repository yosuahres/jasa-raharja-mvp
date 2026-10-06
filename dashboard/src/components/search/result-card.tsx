import Link from "next/link";

import { TierBadge } from "@/components/tier-badge";
import { formatRange, joinFacts } from "@/lib/format";

import type { SearchResult } from "./results";

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * One hospital as a ticket: who on the left, the price on the right. The whole card opens the hospital.
 * The row's own name shows only when its document calls the tindakan something other than what was searched.
 */
export function ResultCard({ result: r, treatmentName }: { result: SearchResult; treatmentName: string }) {
  return (
    <li className="group relative grid overflow-hidden rounded-xl bg-card ring-1 ring-border transition-shadow hover:shadow-md sm:min-h-32 sm:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/rumah-sakit/${r.id}`}
            className="truncate text-base font-semibold tracking-tight outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring group-hover:underline"
          >
            {r.name}
          </Link>
          <TierBadge tier={r.tier} />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {joinFacts(r.city, r.tipe && `Tipe ${r.tipe}`)} ·{" "}
          {r.partner ? "Mitra PKS" : <span className="text-tier-c-ink">Belum mitra PKS</span>}
        </p>
        {!sameName(r.rowName, treatmentName) && <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{r.rowName}</p>}
      </div>

      <div className="flex items-start border-t border-dashed p-5 sm:justify-end sm:border-t-0 sm:border-l">
        <p className="text-xl font-bold tracking-tight whitespace-nowrap tabular-nums">{formatRange(r.priceMin, r.priceMax)}</p>
      </div>
    </li>
  );
}
