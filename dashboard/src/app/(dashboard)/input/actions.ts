"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";

import { requireUser, saveError, slugify, text, uniqueId } from "@/lib/form";
import { SHARED_DATA_TAG } from "@/lib/data/queries";
import type { Detection, DetectedProfile } from "@/lib/data/types";
import { wakeExtractor } from "@/lib/extractor";
import { geocodeHospital } from "@/lib/geocode";
import { findHospital } from "@/lib/hospital-match";
import { createClient } from "@/lib/supabase/server";
import { TARIFF_BUCKET } from "@/lib/supabase/env";

export type SaveState = { error: string | null };

/** What saving a preview gives back: the hospital its tariffs went to, once saved. */
export type SaveResult = SaveState & { hospitalId?: string };

type ReviewBook = {
  id: string;
  status: string;
  detected_profile: DetectedProfile;
  detected_facilities: Detection[];
  detected_specialties: Detection[];
};

/**
 * Saves a previewed upload: the hospital it is about (created, or updated when one with the same
 * name exists) with what the document says, then publishes the book as that hospital's tariffs.
 * Fields the document doesn't print keep the hospital's earlier values.
 */
export async function saveImport(_previous: SaveResult, data: FormData): Promise<SaveResult> {
  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return { error: denied };

  const { data: book, error: bookError } = await supabase
    .from("tariff_books")
    .select("id, status, detected_profile, detected_facilities, detected_specialties")
    .eq("id", text(data, "book_id"))
    .single<ReviewBook>();
  if (bookError) return { error: saveError(bookError) };
  if (book.status !== "review") return { error: "Dokumen ini sudah disimpan atau sedang diproses ulang." };

  const profile = book.detected_profile;
  const name = profile.name?.value;
  const year = profile.year?.value ?? null;
  if (!name) return { error: "Nama rumah sakit tidak terbaca dari dokumen." };

  const { data: hospitals, error: listError } = await supabase.from("hospitals").select("id, name, partner");
  if (listError) return { error: saveError(listError) };
  const existing = findHospital(hospitals, name);

  // A newer document updates what it prints; what it doesn't print keeps its earlier value.
  const fields = {
    ...(profile.city ? { city: profile.city.value } : {}),
    ...(profile.province ? { province: profile.province.value } : {}),
    ...(profile.address ? { address: profile.address.value } : {}),
    ...(profile.ownership ? { ownership: profile.ownership.value } : {}),
    partner: Boolean(profile.partner?.value) || Boolean(existing?.partner),
  };
  let hospitalId = existing?.id;
  if (hospitalId) {
    const { error } = await supabase.from("hospitals").update(fields).eq("id", hospitalId);
    if (error) return { error: saveError(error) };
  } else {
    hospitalId = await uniqueId(supabase, "hospitals", slugify(name));
    const { error } = await supabase.from("hospitals").insert({ id: hospitalId, name, ...fields });
    if (error) return { error: saveError(error) };
  }

  // Facilities and specialists the document shows tariffs for. It doesn't print how many or their hours, so those stay empty.
  const [facilities, staff] = await Promise.all([
    supabase.from("hospital_facilities").upsert(
      book.detected_facilities.map((d) => ({ hospital_id: hospitalId, facility_id: d.id })),
      { onConflict: "hospital_id,facility_id", ignoreDuplicates: true },
    ),
    supabase.from("hospital_staff").upsert(
      book.detected_specialties.map((d) => ({ hospital_id: hospitalId, specialty_id: d.id })),
      { onConflict: "hospital_id,specialty_id", ignoreDuplicates: true },
    ),
  ]);
  const detailError = facilities.error ?? staff.error;
  if (detailError) return { error: saveError(detailError) };

  // "2025-2" for the year's second document; without a printed year, just the count, and no validity.
  const { count } = await supabase
    .from("tariff_books")
    .select("id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId)
    .eq("status", "published")
    .like("version", year ? `${year}-%` : "%");
  const number = (count ?? 0) + 1;
  const { error: publishError } = await supabase
    .from("tariff_books")
    .update({
      hospital_id: hospitalId,
      version: year ? `${year}-${number}` : String(number),
      valid_from: year ? `${year}-01-01` : null,
      valid_to: year ? `${year}-12-31` : null,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", book.id);
  if (publishError) return { error: saveError(publishError) };

  // Its pin for the map is looked up once the save has answered, so saving doesn't wait on it.
  const savedId = hospitalId;
  after(() => geocodeHospital(supabase, savedId));

  updateTag(SHARED_DATA_TAG);
  revalidatePath("/", "layout");
  return { error: null, hospitalId };
}

/** Starts the extractor on a just-queued upload. */
export async function startExtraction(): Promise<void> {
  const supabase = await createClient();
  if (await requireUser(supabase)) return;
  await wakeExtractor();
}

/** Extracts another hospital out of a document that lists several. */
export async function switchHospital(bookId: string, heading: string): Promise<SaveState> {
  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return { error: denied };
  const { error } = await supabase
    .from("tariff_books")
    .update({ facility_filter: heading, status: "queued", pages_done: 0, error: null })
    .eq("id", bookId)
    .eq("status", "review");
  if (!error) after(wakeExtractor);
  return { error: error ? saveError(error) : null };
}

/** Reads an upload again after the extractor failed on it. */
export async function retryExtraction(bookId: string): Promise<SaveState> {
  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return { error: denied };
  const { error } = await supabase
    .from("tariff_books")
    .update({ status: "queued", pages_done: 0, error: null })
    .eq("id", bookId)
    .eq("status", "failed");
  if (!error) after(wakeExtractor);
  return { error: error ? saveError(error) : null };
}

/** Drops an upload that won't be saved, with its rows and file. */
export async function discardImport(bookId: string): Promise<SaveState> {
  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return { error: denied };
  const { data: book } = await supabase.from("tariff_books").select("storage_path, status").eq("id", bookId).single();
  if (!book || book.status === "published") return { error: null };
  const { error } = await supabase.from("tariff_books").delete().eq("id", bookId);
  if (error) return { error: saveError(error) };
  await supabase.storage.from(TARIFF_BUCKET).remove([book.storage_path]);
  revalidatePath("/input");
  return { error: null };
}
