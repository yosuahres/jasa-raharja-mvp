import type { Tier } from "@/lib/data/types";
import { type CaseMatch, LOCALITY_RANK, type Locality, type TreatmentMatch } from "@/lib/scoring";

/** URL params owned by the filter bar. `q`, `lokasi` and `urut` are left alone on reset. */
export const FILTER_PARAMS = ["tier", "jarak", "harga", "pks", "aktif", "lengkap"] as const;

export const TIERS: Tier[] = ["A", "B", "C"];

export const AREA_OPTIONS = [
  { value: "kota", label: "Kota ini" },
  { value: "provinsi", label: "Provinsi ini" },
  { value: "", label: "Semua" },
] as const;

export const PRICE_OPTIONS = [
  { value: "1", label: "≤ median", factor: 1 },
  { value: "1.2", label: "≤ 1,2× median", factor: 1.2 },
  { value: "", label: "Semua", factor: null },
] as const;

export const SORT_OPTIONS = [
  { value: "rekomendasi", label: "Rekomendasi" },
  { value: "harga", label: "Termurah" },
  { value: "jarak", label: "Terdekat" },
] as const;

/** For an accident case, also by how many of its steps a hospital covers. */
export const CASE_SORT_OPTIONS = [
  { value: "rekomendasi", label: "Rekomendasi" },
  { value: "lengkap", label: "Terlengkap" },
  { value: "harga", label: "Termurah" },
  { value: "jarak", label: "Terdekat" },
] as const;

export type SortOption = (typeof CASE_SORT_OPTIONS)[number];

export type SortKey = SortOption["value"];

export const parseSort = (value: string | null | undefined, options: readonly SortOption[] = SORT_OPTIONS): SortKey =>
  options.find((o) => o.value === value)?.value ?? "rekomendasi";

export type Filters = {
  tiers: Tier[];
  /** Only hospitals at least this near; null for all. */
  area: Exclude<Locality, "lain"> | null;
  priceFactor: number | null;
  partnerOnly: boolean;
  activeOnly: boolean;
  /** Only hospitals with something for every step of an accident case. */
  completeOnly: boolean;
};

const isTier = (value: string): value is Tier => (TIERS as string[]).includes(value);

/** Reads filters from any param source (server `searchParams` or client `URLSearchParams`). */
export const parseFilters = (get: (key: string) => string | null | undefined): Filters => {
  const tier = get("tier");
  const area = AREA_OPTIONS.find((o) => o.value && o.value === get("jarak"));
  const price = PRICE_OPTIONS.find((o) => o.value && o.value === get("harga"));
  return {
    // No param means every tier; an empty param means the user unticked them all.
    tiers: tier == null ? TIERS : tier.split(",").filter(isTier),
    area: area?.value || null,
    priceFactor: price?.factor ?? null,
    partnerOnly: get("pks") === "1",
    activeOnly: get("aktif") === "1",
    completeOnly: get("lengkap") === "1",
  };
};

export const countActiveFilters = (f: Filters) =>
  [f.tiers.length < TIERS.length, f.area !== null, f.priceFactor !== null, f.partnerOnly, f.activeOnly, f.completeOnly].filter(Boolean).length;

export const DEFAULT_FILTERS: Filters = { tiers: TIERS, area: null, priceFactor: null, partnerOnly: false, activeOnly: false, completeOnly: false };

/** Filters as URL params; `null` removes one. The inverse of parseFilters. */
export const filterParams = (f: Filters): Record<(typeof FILTER_PARAMS)[number], string | null> => ({
  tier: f.tiers.length === TIERS.length ? null : TIERS.filter((t) => f.tiers.includes(t)).join(","),
  jarak: f.area,
  harga: PRICE_OPTIONS.find((o) => o.factor === f.priceFactor)?.value || null,
  pks: f.partnerOnly ? "1" : null,
  aktif: f.activeOnly ? "1" : null,
  lengkap: f.completeOnly ? "1" : null,
});

/** What the filters look at in a match: small and serializable, so the filter panel can count results as you choose. */
export type FilterFacts = {
  tier: Tier;
  locality: Locality;
  /** Price against the median, 1 at it; null when it can't be compared. */
  priceRatio: number | null;
  partner: boolean;
  expired: boolean;
  /** Covers every step of an accident case; undefined outside one. */
  complete?: boolean;
};

export const factsOf = (m: TreatmentMatch): FilterFacts => ({
  tier: m.tier,
  locality: m.locality,
  priceRatio: m.priceMid / m.medianPrice,
  partner: m.summary.hospital.partner,
  expired: m.summary.dataExpired,
});

/** A case spans many tindakan, so its price is the hospital's prices against the others' overall. */
export const caseFactsOf = (m: CaseMatch): FilterFacts => ({
  tier: m.tier,
  locality: m.locality,
  priceRatio: m.summary.hospital.priceIndex?.ratio ?? null,
  partner: m.summary.hospital.partner,
  expired: m.summary.dataExpired,
  complete: m.covered === m.steps.length,
});

export const matchesFilters = (x: FilterFacts, f: Filters) =>
  f.tiers.includes(x.tier) &&
  (f.area === null || LOCALITY_RANK[x.locality] <= LOCALITY_RANK[f.area]) &&
  (f.priceFactor === null || (x.priceRatio !== null && x.priceRatio <= f.priceFactor)) &&
  (!f.partnerOnly || x.partner) &&
  (!f.activeOnly || !x.expired) &&
  (!f.completeOnly || x.complete !== false);

export const applyFilters = <T>(list: T[], f: Filters, facts: (item: T) => FilterFacts) =>
  list.filter((item) => matchesFilters(facts(item), f));
