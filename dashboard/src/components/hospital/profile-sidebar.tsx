import {
  Banknote,
  BedDouble,
  Building,
  CalendarRange,
  ChevronDown,
  CircleCheck,
  FileText,
  GitCompareArrows,
  Handshake,
  HeartPulse,
  Landmark,
  ListChecks,
  type LucideIcon,
  Map as MapIcon,
  MapPin,
  Shapes,
  Trophy,
  Upload,
} from "lucide-react";
import Link from "next/link";

import { RatingPill } from "@/components/rating";
import { TipeBadge } from "@/components/tier-badge";
import type { Hospital } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import type { HospitalSummary } from "@/lib/scoring";
import type { Completeness } from "@/lib/tariff-book";
import { cn } from "@/lib/utils";

const ACTION =
  "flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-muted px-2 text-xs text-foreground transition-colors outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50";

/** The hospital page's left pane: its name and actions, then every fact about it in foldable sections. */
export function ProfileSidebar({
  summary,
  peer,
  completeness,
}: {
  summary: HospitalSummary;
  /** Who the compare button pairs it with. */
  peer?: Hospital;
  completeness: Completeness;
}) {
  const { hospital } = summary;
  const book = hospital.tariffBook;
  const compareIds = peer ? [hospital.id, peer.id] : [hospital.id];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hospital.name, hospital.city].filter(Boolean).join(" "))}`;
  const complete = completeness.filter((c) => c.complete).length;

  return (
    <>
      <div className="flex flex-col gap-2 border-b px-4 pt-2.5 pb-3">
        <h1 className="text-base leading-snug font-semibold text-balance break-words">{hospital.name}</h1>
        <div className="flex w-full items-stretch gap-2">
          <Link
            href={`/bandingkan?rs=${compareIds.join(",")}`}
            title={peer ? `Bandingkan dengan ${peer.name}` : "Bandingkan"}
            aria-label="Bandingkan"
            className={ACTION}
          >
            <GitCompareArrows className="size-3.5 shrink-0" />
            <span className="hidden truncate @sm:inline">Bandingkan</span>
          </Link>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Cari di Google Maps" aria-label="Cari di Google Maps" className={ACTION}>
            <MapPin className="size-3.5 shrink-0" />
            <span className="hidden truncate @sm:inline">Maps</span>
          </a>
          <Link href="/input" title="Upload dokumen baru" aria-label="Upload dokumen baru" className={ACTION}>
            <Upload className="size-3.5 shrink-0" />
            <span className="hidden truncate @sm:inline">Upload</span>
          </Link>
        </div>
      </div>

      <Section title="Penilaian">
        <Field icon={Trophy} label="Peringkat">
          {summary.placing && (
            <span className="tabular-nums">
              <span className="font-medium">{summary.placing.rank}</span>
              <span className="text-muted-foreground"> dari {summary.placing.of}</span>
            </span>
          )}
        </Field>
        <Field icon={Shapes} label="Tipe">
          {summary.tipe && <TipeBadge tipe={summary.tipe} />}
        </Field>
        <Field icon={Banknote} label="Harga">
          <RatingPill level={summary.price?.level ?? null} />
          {summary.price && <span className="block text-xs text-muted-foreground">{summary.price.reason}</span>}
        </Field>
        <Field icon={HeartPulse} label="Layanan">
          <RatingPill level={summary.services.level} />
          <span className="block text-xs text-muted-foreground">{summary.services.reason}</span>
        </Field>
      </Section>

      <Section title="Profil">
        <Field icon={Landmark} label="Kepemilikan">
          {hospital.ownership}
        </Field>
        <Field icon={BedDouble} label="Tempat tidur">
          {hospital.beds > 0 && <span className="tabular-nums">{hospital.beds.toLocaleString("id-ID")}</span>}
        </Field>
        <Field icon={Handshake} label="Kerja sama">
          <span className={cn(!hospital.partner && "text-tier-c-ink")}>{hospital.partner ? "Mitra PKS" : "Belum mitra PKS"}</span>
        </Field>
        <Field icon={MapPin} label="Alamat">
          {hospital.address}
        </Field>
        <Field icon={Building} label="Kota">
          {hospital.city}
        </Field>
        <Field icon={MapIcon} label="Provinsi">
          {hospital.province}
        </Field>
      </Section>

      <Section title="Data tarif">
        {book ? (
          <>
            <Field icon={FileText} label="Versi">
              {book.version}
            </Field>
            <Field icon={CalendarRange} label="Berlaku">
              <span className="tabular-nums">
                {formatDate(book.validFrom)} – {formatDate(book.validTo)}
              </span>
            </Field>
            <Field icon={CircleCheck} label="Status">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  summary.dataExpired ? "bg-tier-c-soft text-tier-c-ink" : "bg-tier-a-soft text-tier-a-ink",
                )}
              >
                {summary.dataExpired ? "Kedaluwarsa" : "Berlaku"}
              </span>
            </Field>
          </>
        ) : (
          <Field icon={FileText} label="Dokumen">
            <span className="text-tier-c-ink">Belum ada data tarif terbit</span>
          </Field>
        )}
        <Field icon={ListChecks} label="Kelengkapan">
          <span className={cn("tabular-nums", complete < completeness.length && "text-tier-c-ink")}>
            {complete}/{completeness.length}
          </span>
        </Field>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group/section border-b">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-sm transition-colors outline-none hover:bg-accent/50 focus-visible:bg-accent/50 [&::-webkit-details-marker]:hidden">
        <span className="truncate">{title}</span>
        <ChevronDown className="size-3.5 shrink-0 -rotate-90 text-muted-foreground transition-transform group-open/section:rotate-0" />
      </summary>
      <dl className="flex flex-col gap-2 px-4 pb-4 text-sm">{children}</dl>
    </details>
  );
}

/** A label that widens with the pane, and its value; an empty value shows as a dash. */
function Field({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  const empty = children === null || children === undefined || children === false || children === "";

  return (
    <div className="flex items-start gap-2 py-0.5">
      <dt className="flex w-[clamp(6.5rem,calc(var(--sidebar-w,288px)*0.34),12rem)] shrink-0 items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className={cn("min-w-0 flex-1 break-words", empty && "text-muted-foreground")}>{empty ? "—" : children}</dd>
    </div>
  );
}
