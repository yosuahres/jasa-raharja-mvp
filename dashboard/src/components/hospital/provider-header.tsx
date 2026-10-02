import { ArrowLeft, GitCompareArrows, MapPin, Upload } from "lucide-react";
import Link from "next/link";

import { RatingPill } from "@/components/rating";
import { TierBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import type { Hospital } from "@/lib/data/types";
import { formatDate, joinFacts, kelasLabel } from "@/lib/format";
import type { HospitalSummary } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** Compact header for the hospital page: identity on the left, score and actions on the right, key facts below. */
export function ProviderHeader({ summary, peer }: { summary: HospitalSummary; peer?: Hospital }) {
  const { hospital } = summary;
  const book = hospital.tariffBook;
  const compareIds = peer ? [hospital.id, peer.id] : [hospital.id];

  return (
    <header>
      <Link href="/rumah-sakit" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Rumah Sakit
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{hospital.name}</h1>
            {summary.tier && <TierBadge tier={summary.tier} showLabel />}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {[hospital.address, hospital.city, hospital.province].filter(Boolean).join(", ")}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            {joinFacts(
              kelasLabel(hospital.kelas),
              hospital.ownership,
              hospital.beds > 0 && `${hospital.beds.toLocaleString("id-ID")} tempat tidur`,
            )}
            {(hospital.kelas || hospital.ownership || hospital.beds > 0) && " · "}
            <span className={cn(!hospital.partner && "text-tier-c-ink")}>{hospital.partner ? "Mitra PKS" : "Belum mitra PKS"}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end">
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">Peringkat</p>
            <p className="text-3xl leading-tight font-semibold tracking-tight tabular-nums">
              {summary.placing ? (
                <>
                  {summary.placing.rank}
                  <span className="text-base font-normal text-muted-foreground"> dari {summary.placing.of}</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href={`/bandingkan?rs=${compareIds.join(",")}`}
              title={peer && `Bandingkan dengan ${peer.name}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <GitCompareArrows />
              Bandingkan
            </Link>
            <Link href="/input" className={buttonVariants()}>
              <Upload />
              Upload dokumen baru
            </Link>
          </div>
        </div>
      </div>

      <dl className="mt-5 grid divide-y rounded-xl border text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Fact label="Harga">
          <RatingPill level={summary.price?.level ?? null} />
          {summary.price && <span className="text-xs text-muted-foreground">{summary.price.reason}</span>}
        </Fact>
        <Fact label="Layanan">
          <RatingPill level={summary.services.level} />
          <span className="text-xs text-muted-foreground">{summary.services.reason}</span>
        </Fact>
        {book ? (
          <Fact label={`Data tarif ${book.version}`}>
            <span className={cn("font-medium", summary.dataExpired && "text-tier-c-ink")}>
              {summary.dataExpired ? "Kedaluwarsa" : "Berlaku s.d."} {formatDate(book.validTo)}
            </span>
          </Fact>
        ) : (
          <Fact label="Data tarif">
            <span className="font-medium text-tier-c-ink">Belum ada data tarif terbit</span>
          </Fact>
        )}
      </dl>
    </header>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:block">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-1">{children}</dd>
    </div>
  );
}
