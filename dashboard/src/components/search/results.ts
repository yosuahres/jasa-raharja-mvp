import type { Tier } from "@/lib/data/types";
import { fairPriceLevel, type Locality, type PriceLevel, type ServiceLevel, type TreatmentMatch } from "@/lib/scoring";

/** The slice of a TreatmentMatch the client needs: flat and serializable. */
export type SearchResult = {
  id: string;
  name: string;
  city: string;
  kelas: string | null;
  partner: boolean;
  tier: Tier;
  rank: number;
  composite: number;
  /** The row of its document that matched, as printed. */
  rowName: string;
  rowPage: number;
  otherRows: number;
  priceMin: number;
  priceMax: number;
  savingVsMedian: number;
  /** This treatment's price against its harga wajar. */
  priceLevel: PriceLevel;
  serviceLevel: ServiceLevel;
  locality: Locality;
  strengths: string[];
  notes: string[];
  /** First in the recommended order, whatever the current sort or filters. */
  recommended: boolean;
};

export const toSearchResult = (m: TreatmentMatch, { rank, recommended }: { rank: number; recommended: boolean }): SearchResult => ({
  id: m.summary.hospital.id,
  name: m.summary.hospital.name,
  city: m.summary.hospital.city,
  kelas: m.summary.hospital.kelas,
  partner: m.summary.hospital.partner,
  tier: m.tier,
  rank,
  composite: m.composite,
  rowName: m.line.rawName,
  rowPage: m.line.page,
  otherRows: m.otherRows,
  priceMin: m.line.priceMin,
  priceMax: m.line.priceMax,
  savingVsMedian: m.savingVsMedian,
  priceLevel: fairPriceLevel(m.savingVsMedian),
  serviceLevel: m.summary.services.level,
  locality: m.locality,
  strengths: m.strengths,
  notes: m.notes,
  recommended,
});

/** "12% di bawah median", or "Setara median" when within ±2%. */
export const medianDelta = (savingVsMedian: number) =>
  Math.abs(savingVsMedian) < 0.02
    ? "Setara median"
    : `${Math.round(Math.abs(savingVsMedian) * 100)}% ${savingVsMedian > 0 ? "di bawah" : "di atas"} median`;
