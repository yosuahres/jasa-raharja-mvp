"use server";

import { revalidatePath, updateTag } from "next/cache";

import { SHARED_DATA_TAG } from "@/lib/data/queries";
import { requireUser, saveError } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { TARIFF_BUCKET } from "@/lib/supabase/env";

/**
 * Deletes hospitals for good. Their tariff books, rows and facility links go with them (on delete
 * cascade); the uploaded files are removed from storage afterwards.
 */
export async function deleteHospitals(ids: string[]): Promise<{ error: string | null }> {
  if (ids.length === 0) return { error: null };
  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return { error: denied };

  const { data: books } = await supabase.from("tariff_books").select("storage_path").in("hospital_id", ids);
  const { error } = await supabase.from("hospitals").delete().in("id", ids);
  if (error) return { error: saveError(error) };

  const paths = (books ?? []).map((b) => b.storage_path).filter(Boolean);
  if (paths.length > 0) await supabase.storage.from(TARIFF_BUCKET).remove(paths);

  updateTag(SHARED_DATA_TAG);
  revalidatePath("/", "layout");
  return { error: null };
}
