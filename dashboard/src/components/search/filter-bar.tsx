"use client";

import { Check, ChevronDown, RotateCcw } from "lucide-react";

import { TierDot } from "@/components/tier-badge";
import { Button } from "@/components/ui/button";
import type { Tier } from "@/lib/data/types";
import { cn } from "@/lib/utils";

import {
  countActiveFilters,
  AREA_OPTIONS,
  FILTER_PARAMS,
  parseFilters,
  parseSort,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  TIERS,
} from "./filters";
import { useUrlParams } from "./use-url-params";

const RESET = Object.fromEntries(FILTER_PARAMS.map((key) => [key, null]));

function useFilters() {
  const { params, update, isPending } = useUrlParams();
  const filters = parseFilters((key) => params.get(key));
  return { filters, sort: parseSort(params.get("urut")), update, isPending, reset: () => update(RESET) };
}

/** One row of compact controls above the results. Every choice lives in the URL so a filtered view can be shared. */
export function FilterBar({ tierCounts }: { tierCounts: Record<Tier, number> }) {
  const { filters, update, isPending, reset } = useFilters();
  const active = countActiveFilters(filters);

  const toggleTier = (tier: Tier) => {
    const next = filters.tiers.includes(tier) ? filters.tiers.filter((t) => t !== tier) : [...filters.tiers, tier];
    update({ tier: next.length === TIERS.length ? null : TIERS.filter((t) => next.includes(t)).join(",") });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", isPending && "opacity-80 transition-opacity")}>
      <div role="group" aria-label="Filter tier" className="flex h-8 items-center gap-0.5 rounded-lg bg-muted p-0.5">
        {TIERS.map((tier) => (
          <button
            key={tier}
            onClick={() => toggleTier(tier)}
            aria-pressed={filters.tiers.includes(tier)}
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
          >
            <TierDot tier={tier} />
            {tier}
            <span className="text-muted-foreground tabular-nums">{tierCounts[tier]}</span>
          </button>
        ))}
      </div>

      <MiniSelect
        label="Lokasi"
        value={filters.area ?? ""}
        options={AREA_OPTIONS}
        onChange={(value) => update({ jarak: value || null })}
      />
      <MiniSelect
        label="Harga"
        value={PRICE_OPTIONS.find((o) => o.factor === filters.priceFactor)?.value ?? ""}
        options={PRICE_OPTIONS}
        onChange={(value) => update({ harga: value || null })}
      />
      <ToggleChip label="Mitra PKS" pressed={filters.partnerOnly} onChange={(on) => update({ pks: on ? "1" : null })} />
      <ToggleChip label="Tarif berlaku" pressed={filters.activeOnly} onChange={(on) => update({ aktif: on ? "1" : null })} />

      {active > 0 && (
        <button onClick={reset} className="inline-flex h-8 items-center gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="size-3" /> Reset
        </button>
      )}

      <SortSelect className="ml-auto" />
    </div>
  );
}

function SortSelect({ className }: { className?: string }) {
  const { sort, update } = useFilters();
  return (
    <MiniSelect
      className={className}
      label="Urutkan"
      value={sort}
      options={SORT_OPTIONS}
      onChange={(value) => update({ urut: value === "rekomendasi" ? null : value })}
    />
  );
}

export function ResetFiltersButton() {
  const { reset } = useFilters();
  return (
    <Button onClick={reset} variant="outline" size="lg">
      <RotateCcw /> Reset filter
    </Button>
  );
}

function MiniSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("relative flex h-8 items-center gap-1 rounded-lg bg-muted pr-7 pl-2.5 text-xs", className)}>
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent font-medium text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o.value || "semua"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </label>
  );
}

function ToggleChip({ label, pressed, onChange }: { label: string; pressed: boolean; onChange: (pressed: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!pressed)}
      aria-pressed={pressed}
      className="inline-flex h-8 items-center gap-1 rounded-lg bg-muted px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background"
    >
      {pressed && <Check className="size-3" />}
      {label}
    </button>
  );
}
