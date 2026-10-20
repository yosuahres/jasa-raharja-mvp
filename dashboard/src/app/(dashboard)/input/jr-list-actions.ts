"use server";

import { revalidatePath, updateTag } from "next/cache";
import * as XLSX from "xlsx";

import { SHARED_DATA_TAG } from "@/lib/data/queries";
import { requireUser, saveError, text } from "@/lib/form";
import { matchJrHospital } from "@/lib/hospital-match";
import { createClient } from "@/lib/supabase/server";

export type UploadListResult = { error: string | null; count?: number; linked?: number };

const HEADERS = ["KODE_RUMAHSAKIT", "NAMA_RS", "KODE_LOKET", "NAMA_LOKET"];
const CHUNK = 200;

/** Codes are 7 digits; a cell the sheet stored as a number lost its leading zero. */
const code = (value: unknown) => {
  const s = String(value ?? "").trim();
  return /^\d+$/.test(s) && s.length < 7 ? s.padStart(7, "0") : s;
};

const cell = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

type ListRow = { code: string; name: string; loket_code: string; loket_name: string };

/** Every row of the sheet, or why it can't be read. */
const readSheet = (buffer: ArrayBuffer): { error: string; list?: undefined } | { error?: undefined; list: ListRow[] } => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { error: "File tidak berisi lembar data." };
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  const header = (rows[0] ?? []).map((h) => cell(h).toUpperCase());
  const columns = HEADERS.map((name) => header.indexOf(name));
  if (columns.some((i) => i < 0)) return { error: `Kolom harus ${HEADERS.join(", ")}.` };
  const [kodeRs, namaRs, kodeLoket, namaLoket] = columns;
  const list = rows
    .slice(1)
    .map((r) => ({ code: code(r[kodeRs]), name: cell(r[namaRs]), loket_code: code(r[kodeLoket]), loket_name: cell(r[namaLoket]) }))
    .filter((r) => r.code || r.name);
  const bad = list.find((r) => !r.code || !r.name || !r.loket_code || !r.loket_name);
  if (bad) return { error: `Baris "${bad.name || bad.code}" tidak lengkap.` };
  const codes = new Set(list.map((r) => r.code));
  if (codes.size !== list.length) return { error: "Ada kode rumah sakit yang muncul dua kali." };
  return { list };
};

/**
 * Replaces Jasa Raharja's list of partner hospitals with the uploaded sheet, then links every
 * hospital in the app that isn't linked yet to the row its name matches.
 */
export async function uploadJrList(_previous: UploadListResult, data: FormData): Promise<UploadListResult> {
  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return { error: denied };

  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file .xls atau .xlsx dulu." };
  let read: ReturnType<typeof readSheet>;
  try {
    read = readSheet(await file.arrayBuffer());
  } catch {
    return { error: "File tidak terbaca sebagai lembar kerja Excel." };
  }
  if (read.error !== undefined) return { error: read.error };
  const { list } = read;

  for (let i = 0; i < list.length; i += CHUNK) {
    const { error } = await supabase.from("jr_hospitals").upsert(list.slice(i, i + CHUNK), { onConflict: "code" });
    if (error) return { error: saveError(error) };
  }
  // Rows that left the list go; hospitals linked to them lose their link (on delete set null).
  const { data: existing } = await supabase.from("jr_hospitals").select("code");
  const codes = new Set(list.map((r) => r.code));
  const stale = (existing ?? []).map((r) => r.code).filter((c) => !codes.has(c));
  if (stale.length > 0) {
    const { error } = await supabase.from("jr_hospitals").delete().in("code", stale);
    if (error) return { error: saveError(error) };
  }

  const { data: hospitals } = await supabase.from("hospitals").select("id, name, city").is("jr_code", null);
  let linked = 0;
  for (const h of hospitals ?? []) {
    const match = matchJrHospital(h, list);
    if (!match) continue;
    const { error } = await supabase.from("hospitals").update({ jr_code: match.code }).eq("id", h.id);
    if (!error) linked += 1;
  }

  updateTag(SHARED_DATA_TAG);
  revalidatePath("/", "layout");
  return { error: null, count: list.length, linked };
}

/** Links a hospital to a row of the list, or unlinks it with an empty code. */
export async function setJrCode(data: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return { error: denied };
  const { error } = await supabase
    .from("hospitals")
    .update({ jr_code: text(data, "jr_code") || null })
    .eq("id", text(data, "hospital_id"));
  if (error) return { error: saveError(error) };
  updateTag(SHARED_DATA_TAG);
  revalidatePath("/", "layout");
  return { error: null };
}
