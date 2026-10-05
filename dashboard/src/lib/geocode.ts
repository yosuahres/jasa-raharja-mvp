import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type Place = { id: string; name: string; address: string; city: string; province: string; geocoded_query: string | null };

// OpenStreetMap's public geocoder. Its usage policy asks for an identifying User-Agent and at most one request a second.
const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "jasa-raharja-dashboard (rujukan rumah sakit)";
const SPACING_MS = 1100;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The most specific way to ask for a hospital first, then just its name in its city. */
const queriesFor = (place: Place) =>
  [...new Set([
    [place.name, place.address, place.city, place.province],
    [place.name, place.city],
  ].map((parts) => parts.filter(Boolean).join(", ")))];

/** Coordinates for a query, null when nothing matches. Throws when the geocoder can't be reached, so the hospital is tried again later. */
async function lookup(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${ENDPOINT}?${new URLSearchParams({ q: query, format: "jsonv2", countrycodes: "id", limit: "1" })}`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Geocoder answered ${response.status}`);
  const [hit] = (await response.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

/** Looks a hospital up unless its name and address are the ones already looked up. Returns whether it asked the geocoder. */
async function geocode(supabase: Supabase, place: Place): Promise<boolean> {
  const queries = queriesFor(place);
  if (place.geocoded_query === queries[0]) return false;

  let found: { lat: number; lng: number } | null = null;
  for (const [i, query] of queries.entries()) {
    if (i > 0) await wait(SPACING_MS);
    found = await lookup(query);
    if (found) break;
  }
  await supabase
    .from("hospitals")
    .update({ lat: found?.lat ?? null, lng: found?.lng ?? null, geocoded_query: queries[0], geocoded_at: new Date().toISOString() })
    .eq("id", place.id);
  return true;
}

const PLACE_SELECT = "id, name, address, city, province, geocoded_query";

/** Pins one hospital, e.g. right after its document is saved. */
export async function geocodeHospital(supabase: Supabase, hospitalId: string) {
  const { data } = await supabase.from("hospitals").select(PLACE_SELECT).eq("id", hospitalId).maybeSingle<Place>();
  if (!data) return;
  try {
    await geocode(supabase, data);
  } catch (error) {
    console.error(`Geocoding ${hospitalId} failed:`, error);
  }
}

// One backfill at a time per server, so several open maps don't double the request rate.
let backfilling = false;

/** Pins a few hospitals that have never been looked up or whose address changed since. */
export async function geocodeMissing(supabase: Supabase, limit = 5) {
  if (backfilling) return;
  backfilling = true;
  try {
    // Without the columns (migrations/008) this errors and there is nothing to do yet.
    const { data, error } = await supabase.from("hospitals").select(PLACE_SELECT).returns<Place[]>();
    if (error) return;
    const pending = data.filter((place) => place.geocoded_query !== queriesFor(place)[0]).slice(0, limit);
    for (const [i, place] of pending.entries()) {
      if (i > 0) await wait(SPACING_MS);
      await geocode(supabase, place);
    }
  } catch (error) {
    console.error("Geocoding backlog failed:", error);
  } finally {
    backfilling = false;
  }
}
