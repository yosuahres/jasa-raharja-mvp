"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { RatingPill } from "@/components/rating";
import { TierBadge } from "@/components/tier-badge";
import { formatRange, joinFacts } from "@/lib/format";
import { LOCALITY_LABEL } from "@/lib/scoring";
import { cn } from "@/lib/utils";

import type { SearchResult } from "./results";

export const resultCardId = (id: string) => `hasil-${id}`;

const signedDelta = (savingVsMedian: number) =>
  Math.abs(savingVsMedian) < 0.02 ? "±0%" : `${savingVsMedian > 0 ? "−" : "+"}${Math.round(Math.abs(savingVsMedian) * 100)}%`;

/** One hospital as a dense list row: rank, identity and readiness, then the price. */
export const ResultCard = memo(function ResultCard({
  result: r,
  active,
  onHover,
}: {
  result: SearchResult;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <li
      id={resultCardId(r.id)}
      onMouseEnter={() => onHover(r.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(r.id)}
      onBlur={() => onHover(null)}
      className={cn(
        "group relative grid scroll-mt-4 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3 transition-colors sm:px-8",
        active && "bg-muted/60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
          r.recommended ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
        )}
      >
        {r.rank}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/rumah-sakit/${r.id}`}
            className="truncate text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset hover:underline"
          >
            {r.name}
          </Link>
          <TierBadge tier={r.tier} />
          {r.recommended && (
            <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-background uppercase">
              Rekomendasi
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {joinFacts(r.city, LOCALITY_LABEL[r.locality], r.kelas && `Tipe ${r.kelas}`)} ·{" "}
          {r.partner ? "Mitra PKS" : <span className="text-tier-c-ink">Belum mitra PKS</span>}
        </p>
        <p className="mt-1 text-xs">
          <span className="text-foreground/80">{r.rowName}</span>
          <span className="text-muted-foreground tabular-nums">
            {" "}
            · hal. {r.rowPage}
            {r.otherRows > 0 && ` · ${r.otherRows} baris lain cocok`}
          </span>
        </p>
        {(r.strengths.length > 0 || r.notes.length > 0) && (
          <p className="mt-0.5 text-xs">
            {r.strengths.length > 0 && <span className="text-tier-a-ink">{r.strengths.join(" · ")}</span>}
            {r.strengths.length > 0 && r.notes.length > 0 && <span className="text-muted-foreground"> · </span>}
            {r.notes.length > 0 && <span className="text-tier-c-ink">{r.notes.join(" · ")}</span>}
          </p>
        )}
      </div>

      <div className="flex items-start gap-1">
        <div className="text-right">
          <p className="text-sm font-semibold whitespace-nowrap tabular-nums">{formatRange(r.priceMin, r.priceMax)}</p>
          <p className="mt-1 flex items-center justify-end gap-1.5">
            <span className="text-xs text-muted-foreground tabular-nums">{signedDelta(r.savingVsMedian)}</span>
            <RatingPill level={r.priceLevel} />
          </p>
          <p className="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            Layanan <RatingPill level={r.serviceLevel} />
          </p>
        </div>
        <ChevronRight className="mt-0.5 hidden size-4 text-muted-foreground/50 transition-colors group-hover:text-foreground sm:block" />
      </div>
    </li>
  );
});
