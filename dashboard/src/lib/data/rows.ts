// Database rows → domain types, shared by server queries and the browser preview.
import type { CategoryId } from "@/lib/categories";

import type { TariffLine, TariffPrice } from "./types";

/** Columns to select for a tariff row with its prices. */
export const LINE_SELECT =
  "id, position, page, section, parents, item_no, raw_name, unit, members, flags, category, checked, tariff_prices(kelas, raw_price, amount, superseded)";

export type LineRow = {
  id: string;
  position: number;
  page: number;
  section: string | null;
  parents: string[];
  item_no: string | null;
  raw_name: string;
  unit: string | null;
  members: string[];
  flags: string[];
  category: CategoryId;
  checked: boolean;
  tariff_prices: { kelas: string; raw_price: string; amount: number | null; superseded: boolean }[];
};

/** What each extractor flag says about a row. */
export const FLAG_LABEL: Record<string, string> = {
  unparsed_price: "Tarif bukan angka biasa",
  continued_across_pages: "Nama disambung dari halaman sebelumnya",
  unlabelled_columns: "Tabel tanpa judul kolom",
};

export const toLine = (row: LineRow): TariffLine => {
  const prices: TariffPrice[] = row.tariff_prices.map((p) => ({
    kelas: p.kelas,
    rawPrice: p.raw_price,
    amount: p.amount === null ? null : Number(p.amount),
    superseded: p.superseded,
  }));
  const current = prices.filter((p) => !p.superseded && p.amount !== null).map((p) => p.amount as number);
  return {
    id: row.id,
    position: row.position,
    page: row.page,
    section: row.section,
    parents: row.parents,
    itemNo: row.item_no,
    rawName: row.raw_name,
    unit: row.unit,
    members: row.members,
    flags: row.flags,
    category: row.category,
    prices,
    priceMin: current.length ? Math.min(...current) : null,
    priceMax: current.length ? Math.max(...current) : null,
  };
};

/** Words of a search, for matching each one anywhere in a row's name. */
export const searchWords = (query: string) =>
  query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2)
    .slice(0, 6);
