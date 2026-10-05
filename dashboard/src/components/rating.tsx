import type { PriceLevel, ServiceLevel } from "@/lib/scoring";
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
