import type { PriceLevel, Rating, ServiceLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const LEVEL: Record<PriceLevel | ServiceLevel, { label: string; tone: "good" | "mid" | "bad" }> = {
  murah: { label: "Murah", tone: "good" },
  wajar: { label: "Wajar", tone: "mid" },
  mahal: { label: "Mahal", tone: "bad" },
  lengkap: { label: "Lengkap", tone: "good" },
  cukup: { label: "Cukup", tone: "mid" },
  terbatas: { label: "Terbatas", tone: "bad" },
};

const TONE = {
  good: { dot: "bg-tier-a", text: "text-tier-a-ink" },
  mid: { dot: "bg-tier-b", text: "text-tier-b-ink" },
  bad: { dot: "bg-tier-c", text: "text-tier-c-ink" },
};

/** A rating as a coloured dot and a word, like a traffic light: green is better. */
export function RatingPill({ level, className }: { level: PriceLevel | ServiceLevel | null; className?: string }) {
  if (!level) return <span className={cn("text-xs text-muted-foreground", className)}>Belum bisa dibandingkan</span>;
  const { label, tone } = LEVEL[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap", TONE[tone].text, className)}>
      <span className={cn("size-2 shrink-0 rounded-full", TONE[tone].dot)} />
      {label}
    </span>
  );
}

/** A labelled rating with the line that explains it. */
export function RatingLine({ label, rating }: { label: string; rating: Rating<PriceLevel | ServiceLevel> | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <RatingPill level={rating?.level ?? null} className="mt-0.5" />
      {rating && <p className="mt-0.5 truncate text-xs text-muted-foreground">{rating.reason}</p>}
    </div>
  );
}

/** How the ratings are made, in three lines, for anyone wondering why a hospital sits where it does. */
export function MethodNote({ className }: { className?: string }) {
  return (
    <details className={cn("group text-xs text-muted-foreground", className)}>
      <summary className="w-fit cursor-pointer list-none underline-offset-4 hover:text-foreground hover:underline [&::-webkit-details-marker]:hidden">
        Cara penilaian
      </summary>
      <ul className="mt-2 grid max-w-2xl list-disc gap-1 pl-4 text-pretty">
        <li>
          <span className="font-medium text-foreground">Harga</span>: tarif rumah sakit dibanding rumah sakit lain pada layanan yang namanya
          sama di dokumen. Sepertiga termurah Murah, tengah Wajar, termahal Mahal.
        </li>
        <li>
          <span className="font-medium text-foreground">Layanan</span>: jenis layanan, fasilitas, dan tenaga medis yang terlihat di dokumen.
          Sepertiga terlengkap Lengkap, tengah Cukup, sisanya Terbatas.
        </li>
        <li>
          <span className="font-medium text-foreground">Tier</span>: Harga dan Layanan sama bobotnya. Sepertiga teratas Tier A, tengah Tier B,
          bawah Tier C.
        </li>
      </ul>
    </details>
  );
}
