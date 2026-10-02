import type { Tier } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const TIER_LABEL: Record<Tier, string> = {
  A: "Preferred",
  B: "Standard",
  C: "Selective",
};

const TIER_STYLE: Record<Tier, string> = {
  A: "bg-tier-a-soft text-tier-a-ink ring-tier-a/40",
  B: "bg-tier-b-soft text-tier-b-ink ring-tier-b/40",
  C: "bg-tier-c-soft text-tier-c-ink ring-tier-c/40",
};

const TIER_DOT: Record<Tier, string> = { A: "bg-tier-a", B: "bg-tier-b", C: "bg-tier-c" };

export function TierDot({ tier }: { tier: Tier }) {
  return <span className={cn("size-2 shrink-0 rounded-full", TIER_DOT[tier])} />;
}

export function TierBadge({ tier, showLabel = false, className }: { tier: Tier; showLabel?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        TIER_STYLE[tier],
        className,
      )}
    >
      Tier {tier}
      {showLabel && <span className="font-medium opacity-80">· {TIER_LABEL[tier]}</span>}
    </span>
  );
}
