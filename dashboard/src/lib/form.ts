import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/** "RSUD Dr. Soedono Madiun" → "rsud-dr-soedono-madiun". */
export const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "data";

/** The slug, or the slug with -2, -3, … when another row of the table already has it. */
export async function uniqueId(supabase: Client, table: string, base: string) {
  const { data } = await supabase.from(table).select("id").like("id", `${base}%`);
  const taken = new Set((data ?? []).map((row: { id: string }) => row.id));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Null when signed in; otherwise the message to show. */
export async function requireUser(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ? null : "Sesi Anda telah berakhir. Silakan masuk kembali.";
}

/** Database errors in words a staff member can act on. */
export const saveError = (error: { code?: string; message: string }) => {
  if (error.code === "23505") return "Data dengan nama yang sama sudah ada.";
  return `Data tidak tersimpan: ${error.message}`;
};
