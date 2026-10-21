import { reversePlace, searchPlaces } from "@/lib/geocode";

/** Places for Cari Rujukan's location picker: by what is typed (`q`), or the one at a point (`lat`, `lng`). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (params.has("lat") && Number.isFinite(lat) && Number.isFinite(lng)) return Response.json(await reversePlace(lat, lng));
    const query = (params.get("q") ?? "").trim();
    return Response.json(query.length >= 3 ? await searchPlaces(query) : []);
  } catch {
    // The geocoder is a public service; when it can't be reached the picker just offers the map.
    return Response.json(params.has("lat") ? null : [], { status: 503 });
  }
}
