import type { SortState } from "@/components/data-table/sort-menu";
import type { ColumnDef, ColumnLayout } from "@/components/data-table/use-column-prefs";
import type { Hospital, Tipe } from "@/lib/data/types";
import type { PriceLevel, ServiceLevel } from "@/lib/scoring";

// The hospital list's rows, columns, filters and sorts. No React here, so the page can read the URL with it too.

export type TariffStatus = "berlaku" | "kedaluwarsa" | "belum-ada";

/** One hospital in the list: plain data, small enough to send to the browser. */
export type HospitalRow = {
  id: string;
  name: string;
  /** Empty when the document doesn't print it. */
  city: string;
  ownership: Hospital["ownership"];
  partner: boolean;
  tipe: Tipe | null;
  /** `ratio` is its prices against other hospitals' median: lower is cheaper. */
  price: { level: PriceLevel; reason: string; ratio: number } | null;
  /** `score` 0–100 is what the level comes from: higher offers more. */
  services: { level: ServiceLevel; reason: string; score: number };
  tariff: TariffStatus;
  /** ISO date, for sorting. */
  validTo: string | null;
  /** Formatted on the server, so the page renders the same date on the server and in the browser. */
  validToLabel: string;
};

// ------------------------------------------------------------------ columns

export type ColumnId = "nama" | "kota" | "kepemilikan" | "mitra" | "harga" | "layanan" | "tarif" | "tipe";

// One value per cell, one line per row, every field its own column — the CRM tables' grid.
export const COLUMNS: ColumnDef<ColumnId>[] = [
  { id: "nama", label: "Rumah sakit", required: true, width: 260 },
  { id: "kota", label: "Kota", width: 150 },
  { id: "kepemilikan", label: "Kepemilikan", width: 140 },
  { id: "mitra", label: "Mitra", width: 120 },
  { id: "tipe", label: "Tipe", width: 100 },
  { id: "harga", label: "Harga", width: 120 },
  { id: "layanan", label: "Layanan", width: 120 },
  { id: "tarif", label: "Data tarif", width: 200 },
];

export const DEFAULT_LAYOUT: ColumnLayout<ColumnId> = {
  order: COLUMNS.map((c) => c.id),
  visible: { nama: true, kota: true, kepemilikan: true, mitra: true, tipe: true, harga: true, layanan: true, tarif: true },
};

// ------------------------------------------------------------------ filters

export type FilterId = "kota" | "tipe" | "kepemilikan" | "mitra" | "tarif";

/** Ticked values per filter; an empty list doesn't filter. */
export type Filters = Record<FilterId, string[]>;

export const FILTER_IDS: FilterId[] = ["kota", "tipe", "kepemilikan", "mitra", "tarif"];

export const NO_FILTERS: Filters = { kota: [], tipe: [], kepemilikan: [], mitra: [], tarif: [] };

/** The value for "the document doesn't say" in the Kota and Kepemilikan filters. */
export const NOT_STATED = "-";

export const TIPES: Tipe[] = ["A", "B", "C", "D"];

export const TIPE_DOT: Record<Tipe, string> = { A: "bg-tier-a", B: "bg-tier-b", C: "bg-tier-c", D: "bg-muted-foreground/50" };

export const TARIFF_LABEL: Record<TariffStatus, string> = { berlaku: "Berlaku", kedaluwarsa: "Kedaluwarsa", "belum-ada": "Belum ada" };

export const TARIFF_DOT: Record<TariffStatus, string> = {
  berlaku: "bg-tier-a",
  kedaluwarsa: "bg-tier-c",
  "belum-ada": "bg-muted-foreground/50",
};

const FILTER_VALUE: Record<FilterId, (row: HospitalRow) => string> = {
  kota: (r) => r.city || NOT_STATED,
  tipe: (r) => r.tipe ?? "",
  kepemilikan: (r) => r.ownership ?? NOT_STATED,
  mitra: (r) => (r.partner ? "ya" : "tidak"),
  tarif: (r) => r.tariff,
};

export const filterValueOf = (filter: FilterId, row: HospitalRow) => FILTER_VALUE[filter](row);

export const countActiveFilters = (filters: Filters) => FILTER_IDS.filter((id) => filters[id].length > 0).length;

export const matches = (row: HospitalRow, search: string, filters: Filters) => {
  const query = search.trim().toLowerCase();
  if (query && !`${row.name} ${row.city}`.toLowerCase().includes(query)) return false;
  return FILTER_IDS.every((id) => filters[id].length === 0 || filters[id].includes(FILTER_VALUE[id](row)));
};

// ------------------------------------------------------------------ sorting

export type SortKey = ColumnId;

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "nama", label: "Nama" },
  { value: "kota", label: "Kota" },
  { value: "tipe", label: "Tipe" },
  { value: "harga", label: "Harga" },
  { value: "layanan", label: "Layanan" },
  { value: "tarif", label: "Data tarif" },
  { value: "kepemilikan", label: "Kepemilikan" },
  { value: "mitra", label: "Mitra" },
];

const TIPE_ORDER: Record<Tipe, number> = { A: 0, B: 1, C: 2, D: 3 };

// Ascending is best first where there is a best: cheapest Harga, most complete Layanan, Tipe A, partners.
const SORT_VALUE: Record<SortKey, (row: HospitalRow) => string | number | null> = {
  nama: (r) => r.name,
  kota: (r) => r.city || null,
  tipe: (r) => (r.tipe ? TIPE_ORDER[r.tipe] : null),
  harga: (r) => r.price?.ratio ?? null,
  layanan: (r) => -r.services.score,
  tarif: (r) => r.validTo,
  kepemilikan: (r) => r.ownership,
  mitra: (r) => (r.partner ? 0 : 1),
};

/** Indonesian alphabetical order, ignoring case and accents, with numbers by value. */
export const compareText = new Intl.Collator("id", { sensitivity: "base", numeric: true }).compare;

/**
 * Sorted copy of `rows`. Unknown values (no price yet, no date) go last either way. Ties keep the
 * order the rows came in, which is the ranking; without a sort that order is all there is.
 */
export const sortRows = (rows: HospitalRow[], sort: SortState<SortKey> | null) => {
  if (!sort) return rows;
  const value = SORT_VALUE[sort.key];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    const order = typeof x === "number" && typeof y === "number" ? x - y : compareText(String(x), String(y));
    return order * sign;
  });
};

// ------------------------------------------------------------------ the URL

/** Search, filters and sort as the URL carries them, so a filtered list can be shared. */
export type HospitalQuery = { search: string; filters: Filters; sort: SortState<SortKey> | null };

const PARAM: Record<FilterId, string> = { kota: "kota", tipe: "tipe", kepemilikan: "milik", mitra: "mitra", tarif: "tarif" };

const ALLOWED: Partial<Record<FilterId, readonly string[]>> = {
  tipe: TIPES,
  mitra: ["ya", "tidak"],
  tarif: ["berlaku", "kedaluwarsa", "belum-ada"],
};

/** Our params, to clear before writing them again. */
export const QUERY_PARAMS = ["q", "urut", ...Object.values(PARAM)];

/** `getAll` returns every value of a param, like `URLSearchParams.getAll`. */
export const parseQuery = (getAll: (param: string) => string[]): HospitalQuery => {
  const filters = Object.fromEntries(
    FILTER_IDS.map((id) => {
      const values = [...new Set(getAll(PARAM[id]).filter(Boolean))];
      const allowed = ALLOWED[id];
      const valid = allowed ? values.filter((v) => allowed.includes(v)) : values;
      return [id, id === "mitra" ? valid.slice(0, 1) : valid];
    }),
  ) as Filters;

  // "harga" sorts ascending, "-harga" descending.
  const urut = getAll("urut")[0] ?? "";
  const key = urut.replace(/^-/, "");
  const sort: SortState<SortKey> | null = SORT_OPTIONS.some((o) => o.value === key)
    ? { key: key as SortKey, dir: urut.startsWith("-") ? "desc" : "asc" }
    : null;

  return { search: getAll("q")[0] ?? "", filters, sort };
};

export const queryEntries = ({ search, filters, sort }: HospitalQuery): [string, string][] => [
  ...(search.trim() ? [["q", search.trim()] as [string, string]] : []),
  ...FILTER_IDS.flatMap((id) => filters[id].map((v): [string, string] => [PARAM[id], v])),
  ...(sort ? [["urut", `${sort.dir === "desc" ? "-" : ""}${sort.key}`] as [string, string]] : []),
];
