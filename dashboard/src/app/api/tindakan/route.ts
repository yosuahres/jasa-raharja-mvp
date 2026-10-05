import { findTreatments } from "@/lib/data/queries";

/** Tindakan matching what is typed in Cari Rujukan's picker, from the hospitals' current documents. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await findTreatments(query));
}
