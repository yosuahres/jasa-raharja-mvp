import type { Tier } from "@/lib/data/types";
import type { CaseMatch, TreatmentMatch } from "@/lib/scoring";

/** URL params owned by the filter bar. `q`, `lokasi` and `urut` are left alone on reset. */
export const FILTER_PARAMS = ["tier", "harga", "lengkap"] as const;

export const TIERS: Tier[] = ["A", "B", "C"];

export const PRICE_OPTIONS = [
  { value: "1", label: "≤ median", factor: 1 },
  { value: "1.2", label: "≤ 1,2× median", factor: 1.2 },
  { value: "", label: "Semua", factor: null },
] as const;

export const SORT_OPTIONS = [
  { value: "rekomendasi", label: "Rekomendasi" },
  { value: "harga", label: "Termurah" },
] as const;

/** For an accident case, also by how many of its steps a hospital covers. */
export const CASE_SORT_OPTIONS = [
  { value: "rekomendasi", label: "Rekomendasi" },
  { value: "lengkap", label: "Terlengkap" },
  { value: "harga", label: "Termurah" },
] as const;

/** Offered once the search has a point to measure from. */
export const DISTANCE_SORT_OPTION = { value: "jarak", label: "Terdekat" } as const;

export type SortOption = (typeof CASE_SORT_OPTIONS)[number] | typeof DISTANCE_SORT_OPTION;

export const withDistanceSort = (options: readonly SortOption[], hasOrigin: boolean): readonly SortOption[] =>
  hasOrigin ? [...options, DISTANCE_SORT_OPTION] : options;

export type SortKey = SortOption["value"];

export const parseSort = (value: string | null | undefined, options: readonly SortOption[] = SORT_OPTIONS): SortKey =>
  options.find((o) => o.value === value)?.value ?? "rekomendasi";

export type Filters = {
  tiers: Tier[];
  priceFactor: number | null;
  /** Only hospitals with something for every step of an accident case. */
  completeOnly: boolean;
};

const isTier = (value: string): value is Tier => (TIERS as string[]).includes(value);

/** Reads filters from any param source (server `searchParams` or client `URLSearchParams`). */
export const parseFilters = (get: (key: string) => string | null | undefined): Filters => {
  const tier = get("tier");
  const price = PRICE_OPTIONS.find((o) => o.value && o.value === get("harga"));
  return {
    // No param means every tier; an empty param means the user unticked them all.
    tiers: tier == null ? TIERS : tier.split(",").filter(isTier),
    priceFactor: price?.factor ?? null,
    completeOnly: get("lengkap") === "1",
  };
};

export const countActiveFilters = (f: Filters) =>
  [f.tiers.length < TIERS.length, f.priceFactor !== null, f.completeOnly].filter(Boolean).length;

export const DEFAULT_FILTERS: Filters = { tiers: TIERS, priceFactor: null, completeOnly: false };

/** Filters as URL params; `null` removes one. The inverse of parseFilters. */
export const filterParams = (f: Filters): Record<(typeof FILTER_PARAMS)[number], string | null> => ({
  tier: f.tiers.length === TIERS.length ? null : TIERS.filter((t) => f.tiers.includes(t)).join(","),
  harga: PRICE_OPTIONS.find((o) => o.factor === f.priceFactor)?.value || null,
  lengkap: f.completeOnly ? "1" : null,
});

/** What the filters look at in a match: small and serializable, so the filter panel can count results as you choose. */
export type FilterFacts = {
  tier: Tier;
  /** Price against the median, 1 at it; null when it can't be compared. */
  priceRatio: number | null;
  /** Covers every step of an accident case; undefined outside one. */
  complete?: boolean;
};

export const factsOf = (m: TreatmentMatch): FilterFacts => ({
  tier: m.tier,
  priceRatio: m.priceMid / m.medianPrice,
});

/** A case spans many tindakan, so its price is the hospital's prices against the others' overall. */
export const caseFactsOf = (m: CaseMatch): FilterFacts => ({
  tier: m.tier,
  priceRatio: m.summary.hospital.priceIndex?.ratio ?? null,
  complete: m.covered === m.steps.length,
});

export const matchesFilters = (x: FilterFacts, f: Filters) =>
  f.tiers.includes(x.tier) &&
  (f.priceFactor === null || (x.priceRatio !== null && x.priceRatio <= f.priceFactor)) &&
  (!f.completeOnly || x.complete !== false);

export const applyFilters = <T>(list: T[], f: Filters, facts: (item: T) => FilterFacts) =>
  list.filter((item) => matchesFilters(facts(item), f));
