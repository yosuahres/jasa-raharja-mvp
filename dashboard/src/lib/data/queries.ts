import "server-only";

import { cache } from "react";

import type { CategoryId } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

import { LINE_SELECT, type LineRow, searchWords, toLine } from "./rows";
import type { Catalog, CategoryCounts, Dataset, Hospital, TariffBook, TariffLine } from "./types";

const must = <T>(result: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
};

/** The facilities and specialists the system recognises. Once per request. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const supabase = await createClient();
  const [facilities, specialties] = await Promise.all([
    supabase.from("facilities").select("id, name, category, keywords").order("name"),
    supabase.from("specialties").select("id, name, keywords").order("name"),
  ]);
  return { facilities: must(facilities, "facilities"), specialties: must(specialties, "specialties") };
});

type HospitalRow = Omit<Hospital, "facilities" | "staff" | "priceIndex" | "tariffBook" | "previousBook"> & {
  hospital_facilities: { facility_id: string; qty: number; available_24h: boolean }[];
  hospital_staff: { specialty_id: string; headcount: number; on_call_24h: boolean }[];
};

type PriceIndexRow = { hospital_id: string; price_index: number; compared_rows: number };

type BookRow = {
  id: string;
  hospital_id: string;
  version: string;
  valid_from: string | null;
  valid_to: string | null;
  source_file: string;
  category_counts: CategoryCounts;
};

const toBook = (row: BookRow | undefined): TariffBook | null =>
  row
    ? {
        id: row.id,
        version: row.version,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        source: row.source_file,
        categories: row.category_counts,
        rows: Object.values(row.category_counts).reduce((sum, n) => sum + (n ?? 0), 0),
      }
    : null;

/** Every hospital with its current and previous published document. Once per request. */
export const getHospitals = cache(async (): Promise<Hospital[]> => {
  const supabase = await createClient();
  const [hospitalsResult, booksResult, priceResult] = await Promise.all([
    supabase
      .from("hospitals")
      .select("id, name, kelas, ownership, city, province, address, partner, beds, hospital_facilities(*), hospital_staff(*)")
      .order("name"),
    supabase
      .from("tariff_books")
      .select("id, hospital_id, version, valid_from, valid_to, source_file, category_counts")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase.from("hospital_price_index").select("hospital_id, price_index, compared_rows").returns<PriceIndexRow[]>(),
  ]);
  const hospitals = must<HospitalRow[]>(hospitalsResult, "hospitals");
  const books = must<BookRow[]>(booksResult, "tariff books");
  // The price index is a view (migrations/005); until it exists, hospitals just have no price rating.
  const prices = priceResult.error ? [] : (priceResult.data ?? []);

  return hospitals.map(({ hospital_facilities, hospital_staff, ...h }) => {
    // Newest first, so a hospital's first two are its current and previous ones.
    const [current, previous] = books.filter((b) => b.hospital_id === h.id);
    const price = prices.find((p) => p.hospital_id === h.id);
    return {
      ...h,
      facilities: hospital_facilities.map((f) => ({ facilityId: f.facility_id, qty: f.qty, available24h: f.available_24h })),
      staff: hospital_staff.map((s) => ({ specialtyId: s.specialty_id, headcount: s.headcount, onCall24h: s.on_call_24h })),
      priceIndex: price ? { ratio: Number(price.price_index), compared: price.compared_rows } : null,
      tariffBook: toBook(current),
      previousBook: toBook(previous),
    };
  });
});

export const getDataset = cache(async (): Promise<Dataset> => {
  const [catalog, hospitals] = await Promise.all([getCatalog(), getHospitals()]);
  return { catalog, hospitals };
});

export type BookLines = { lines: TariffLine[]; total: number };

/** One page of a document's rows, optionally in one category and matching a search. */
export async function getBookLines(
  bookId: string,
  { category, query, limit, offset = 0 }: { category?: CategoryId; query?: string; limit: number; offset?: number },
): Promise<BookLines> {
  const supabase = await createClient();
  let request = supabase.from("tariff_rows").select(LINE_SELECT, { count: "exact" }).eq("book_id", bookId);
  if (category) request = request.eq("category", category);
  for (const word of searchWords(query ?? "")) request = request.ilike("raw_name", `%${word}%`);
  const result = await request.order("position").range(offset, offset + limit - 1).returns<LineRow[]>();
  return { lines: must(result, "tariff rows").map(toLine), total: result.count ?? 0 };
}

/** Rows of these documents whose name has every word of the search, with the document each is in. */
export async function searchLines(query: string, bookIds: string[]): Promise<(TariffLine & { bookId: string })[]> {
  const words = searchWords(query);
  if (words.length === 0 || bookIds.length === 0) return [];
  const supabase = await createClient();
  let request = supabase.from("tariff_rows").select(`book_id, ${LINE_SELECT}`).in("book_id", bookIds);
  for (const word of words) request = request.ilike("raw_name", `%${word}%`);
  const rows = must(await request.limit(1000).returns<(LineRow & { book_id: string })[]>(), "tariff rows");
  return rows.map((row) => ({ ...toLine(row), bookId: row.book_id }));
}

/** Names of rows that have any word of the search, for suggesting one when none has every word. */
export async function searchNamesAny(query: string, bookIds: string[]): Promise<{ rawName: string; bookId: string }[]> {
  const words = searchWords(query);
  if (words.length === 0 || bookIds.length === 0) return [];
  const supabase = await createClient();
  // searchWords() leaves only [a-z0-9], so the words are safe inside the filter string.
  const rows = must(
    await supabase
      .from("tariff_rows")
      .select("book_id, raw_name")
      .in("book_id", bookIds)
      .or(words.map((w) => `raw_name.ilike.%${w}%`).join(","))
      .limit(1000)
      .returns<{ book_id: string; raw_name: string }[]>(),
    "tariff rows",
  );
  return rows.map((row) => ({ rawName: row.raw_name, bookId: row.book_id }));
}

export type BookRowStats ={ total: number; needsCheck: number };

export const getBookRowStats = cache(async (bookId: string): Promise<BookRowStats> => {
  const supabase = await createClient();
  const [total, flagged] = await Promise.all([
    supabase.from("tariff_rows").select("id", { count: "exact", head: true }).eq("book_id", bookId),
    supabase.from("tariff_rows").select("id", { count: "exact", head: true }).eq("book_id", bookId).not("flags", "eq", "{}"),
  ]);
  if (total.error || flagged.error) throw new Error(`Could not count tariff rows: ${(total.error ?? flagged.error)?.message}`);
  return { total: total.count ?? 0, needsCheck: flagged.count ?? 0 };
});

export type UnfinishedUpload = { id: string; source: string; status: "queued" | "extracting" | "review" | "failed"; createdAt: string };

/** Uploads not yet saved from their preview, newest first, so the upload page can offer to resume them. */
export const getUnfinishedUploads = cache(async (): Promise<UnfinishedUpload[]> => {
  const supabase = await createClient();
  const rows = must<{ id: string; source_file: string; status: UnfinishedUpload["status"]; created_at: string }[]>(
    await supabase
      .from("tariff_books")
      .select("id, source_file, status, created_at")
      .in("status", ["queued", "extracting", "review", "failed"])
      .order("created_at", { ascending: false })
      .limit(5),
    "tariff books",
  );
  return rows.map((r) => ({ id: r.id, source: r.source_file, status: r.status, createdAt: r.created_at }));
});
