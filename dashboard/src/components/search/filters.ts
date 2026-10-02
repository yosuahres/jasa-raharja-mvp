import type { Tier } from "@/lib/data/types";
import { LOCALITY_RANK, type Locality, type TreatmentMatch } from "@/lib/scoring";

/** URL params owned by the filter bar. `q`, `lokasi` and `urut` are left alone on reset. */
export const FILTER_PARAMS = ["tier", "jarak", "harga", "pks", "aktif"] as const;

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

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const parseSort = (value: string | null | undefined): SortKey =>
  SORT_OPTIONS.find((o) => o.value === value)?.value ?? "rekomendasi";

export type Filters = {
  tiers: Tier[];
  /** Only hospitals at least this near; null for all. */
  area: Exclude<Locality, "lain"> | null;
  priceFactor: number | null;
  partnerOnly: boolean;
  activeOnly: boolean;
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
  };
};

export const countActiveFilters = (f: Filters) =>
  [f.tiers.length < TIERS.length, f.area !== null, f.priceFactor !== null, f.partnerOnly, f.activeOnly].filter(Boolean).length;

export const applyFilters = (list: TreatmentMatch[], f: Filters) =>
  list.filter(
    (m) =>
      f.tiers.includes(m.tier) &&
      (f.area === null || LOCALITY_RANK[m.locality] <= LOCALITY_RANK[f.area]) &&
      (f.priceFactor === null || m.priceMid <= m.medianPrice * f.priceFactor) &&
      (!f.partnerOnly || m.summary.hospital.partner) &&
      (!f.activeOnly || !m.summary.dataExpired),
  );
