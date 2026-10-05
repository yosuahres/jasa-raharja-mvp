import { CalendarRange, CircleCheck, FileText, ListChecks, type LucideIcon, MapPin, Rows3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Hospital } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import type { Completeness } from "@/lib/tariff-book";
import { cn } from "@/lib/utils";

/** The Data & lokasi tab: a grid of key facts, then the completeness checks, location and versions as lists. */
export function DataOverview({ hospital, completeness, expired }: { hospital: Hospital; completeness: Completeness; expired: boolean }) {
  const book = hospital.tariffBook;
  const previous = hospital.previousBook;
  const complete = completeness.filter((c) => c.complete).length;
  const place = [hospital.city, hospital.province].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hospital.name, hospital.city].filter(Boolean).join(" "))}`;
  const versions = [book, previous].filter((b) => b !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold">Ringkasan</span>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <HighlightCard icon={ListChecks} label="Kelengkapan data" warn={complete < completeness.length}>
            {complete} dari {completeness.length} lengkap
          </HighlightCard>
          <HighlightCard icon={CircleCheck} label="Status data" warn={!book || expired}>
            {book ? (expired ? "Kedaluwarsa" : `Berlaku s.d. ${formatDate(book.validTo)}`) : "Belum ada data tarif terbit"}
          </HighlightCard>
          <HighlightCard icon={MapPin} label="Lokasi">
            {place}
          </HighlightCard>
          <HighlightCard icon={FileText} label="Versi">
            {book?.version}
          </HighlightCard>
          <HighlightCard icon={CalendarRange} label="Berlaku">
            {book && `${formatDate(book.validFrom)} – ${formatDate(book.validTo)}`}
          </HighlightCard>
          <HighlightCard icon={Rows3} label="Baris tarif">
            {book && book.rows.toLocaleString("id-ID")}
          </HighlightCard>
        </div>
      </div>

      <ListSection title="Kelengkapan data">
        {completeness.map((item) => (
          <Row key={item.label} label={item.label} detail={item.detail}>
            <span className={item.complete ? "text-tier-a-ink" : "text-tier-c-ink"}>{item.complete ? "Lengkap" : "Belum lengkap"}</span>
          </Row>
        ))}
      </ListSection>

      <ListSection
        title="Lokasi"
        action={
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
            Buka di Google Maps
          </a>
        }
      >
        <Row label="Alamat">{hospital.address || "—"}</Row>
        <Row label="Kota">{hospital.city || "—"}</Row>
        <Row label="Provinsi">{hospital.province || "—"}</Row>
      </ListSection>

      {book && (
        <ListSection title="Riwayat versi">
          {versions.map((v) => (
            <Row
              key={v.id}
              label={
                <span className="flex items-center gap-2">
                  {v.version}
                  {v === book && <Badge variant="secondary">Aktif</Badge>}
                </span>
              }
              detail={v.source}
            >
              <span className="tabular-nums">
                {formatDate(v.validFrom)} – {formatDate(v.validTo)} · {v.rows.toLocaleString("id-ID")} baris
              </span>
            </Row>
          ))}
        </ListSection>
      )}
    </div>
  );
}

function HighlightCard({ icon: Icon, label, warn, children }: { icon: LucideIcon; label: string; warn?: boolean; children: React.ReactNode }) {
  const empty = children === null || children === undefined || children === false || children === "";

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      </div>
      <span className={cn("truncate text-sm", empty ? "text-muted-foreground" : warn ? "text-tier-c-ink" : "text-foreground")}>
        {empty ? "—" : children}
      </span>
    </div>
  );
}

function ListSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        {action}
      </div>
      <div className="flex flex-col rounded-xl border px-3">{children}</div>
    </div>
  );
}

function Row({ label, detail, children }: { label: React.ReactNode; detail?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 last:border-0">
      <span className="min-w-0 text-sm">
        <span className="block truncate">{label}</span>
        {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      <span className="max-w-[60%] shrink-0 text-right text-xs text-muted-foreground">{children}</span>
    </div>
  );
}
