import type { Tier, Tipe } from "@/lib/data/types";
import { treatmentNameOf, type TreatmentMatch } from "@/lib/scoring";

/** The slice of a TreatmentMatch a result card shows. */
export type SearchResult = {
  id: string;
  name: string;
  city: string;
  /** Its place in the overall ranking; null until it has a published document. */
  tipe: Tipe | null;
  /** The Jasa Raharja office that handles its claims; null until linked. */
  loket: string | null;
  tier: Tier;
  /** What its document calls the treatment, as printed. */
  rowName: string;
  priceMin: number;
  priceMax: number;
};

export const toSearchResult = (m: TreatmentMatch): SearchResult => ({
  id: m.summary.hospital.id,
  name: m.summary.hospital.name,
  city: m.summary.hospital.city,
  tipe: m.summary.tipe,
  loket: m.summary.hospital.jasaRaharja?.loketName ?? null,
  tier: m.tier,
  rowName: treatmentNameOf(m.line),
  priceMin: m.line.priceMin,
  priceMax: m.line.priceMax,
});
