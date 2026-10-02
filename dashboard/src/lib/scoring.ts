import { CARE_CATEGORIES } from "./categories";
import type { Dataset, Hospital, TariffLine, Tier } from "./data/types";

/** How the general score weighs each part. */
export const WEIGHTS = {
  clinical: 0.3,
  facility: 0.25,
  services: 0.25,
  access: 0.2,
} as const;

export type Scores = {
  /** Specialists recognised in its document, against all the system knows. */
  clinical: number;
  /** Facilities recognised in its document, against all the system knows. */
  facility: number;
  /** Kinds of care its document has tariffs for. */
  services: number;
  /** 24-hour emergency room and ambulances. */
  access: number;
};

// Credit for an item that is there at all, there 24 hours, and in depth.
const PRESENT_CREDIT = 0.55;
const ROUND_THE_CLOCK_CREDIT = 0.2;
const DEPTH_CREDIT = 0.25;

const SPECIALIST_DEPTH_TARGET = 3;
const FACILITY_DEPTH_TARGET: Record<string, number> = { ok: 6, icu: 12, hcu: 8, ambulans: 4, "c-arm": 2, rontgen: 2 };

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** True when the current document has run out. Without a printed year it can't. */
export const isExpired = (hospital: Hospital, today = new Date()) =>
  hospital.tariffBook?.validTo != null && new Date(hospital.tariffBook.validTo) < today;

/** Where a referral starts: a city and province as hospitals' documents print them. */
export type Origin = { city: string; province: string };

/** How near a hospital is to the origin. Documents print a city, not coordinates, so this is as close as it gets. */
export type Locality = "kota" | "provinsi" | "lain";

export const LOCALITY_LABEL: Record<Locality, string> = { kota: "Satu kota", provinsi: "Satu provinsi", lain: "Luar provinsi" };

export const LOCALITY_RANK: Record<Locality, number> = { kota: 0, provinsi: 1, lain: 2 };

const LOCALITY_SCORE: Record<Locality, number> = { kota: 100, provinsi: 50, lain: 0 };

export const localityOf = (hospital: Hospital, origin: Origin): Locality => {
  if (hospital.city && hospital.city === origin.city) return "kota";
  return hospital.province && hospital.province === origin.province ? "provinsi" : "lain";
};

/** Every city a hospital's document names, to start a referral from. */
export const originsOf = (hospitals: Hospital[]): Origin[] => {
  const byCity = new Map(hospitals.filter((h) => h.city).map((h) => [h.city, { city: h.city, province: h.province }]));
  return [...byCity.values()].sort((a, b) => a.city.localeCompare(b.city));
};

/** Share of the items that are there, with extra credit for 24 hours and depth. */
const coverage = (ids: string[], lookup: (id: string) => { present: boolean; roundTheClock: boolean; depth: number }) => {
  if (ids.length === 0) return 0;
  const earned = ids.reduce((sum, id) => {
    const { present, roundTheClock, depth } = lookup(id);
    return sum + (present ? PRESENT_CREDIT + (roundTheClock ? ROUND_THE_CLOCK_CREDIT : 0) + DEPTH_CREDIT * Math.min(depth, 1) : 0);
  }, 0);
  return (earned / ids.length) * 100;
};

// How quickly a victim gets into care once there: 24h IGD and ambulance fleet.
const serviceAccess = (hospital: Hospital) => {
  const igd = hospital.facilities.find((f) => f.facilityId === "igd");
  const ambulances = hospital.facilities.find((f) => f.facilityId === "ambulans")?.qty ?? 0;
  return (igd?.available24h ? 50 : igd ? 25 : 0) + 50 * Math.min(ambulances / 4, 1);
};

export type Placing = { tier: Tier; /** 1 for the best; equal scores share a place. */ rank: number; of: number };

/**
 * Tiers are relative: the items are ranked against each other on their score, and the top third
 * is Tier A, the middle third Tier B, the bottom third Tier C. Equal scores (to the point) share a place.
 */
const placings = <T>(items: T[], score: (item: T) => number): Map<T, Placing> => {
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  const rounded = sorted.map((item) => Math.round(score(item)));
  return new Map(
    sorted.map((item, index) => {
      const place = rounded.indexOf(rounded[index]);
      const share = place / sorted.length;
      return [item, { tier: share < 1 / 3 ? "A" : share < 2 / 3 ? "B" : "C", rank: place + 1, of: sorted.length }];
    }),
  );
};

export const generalScores = (hospital: Hospital, data: Dataset): Scores => ({
  clinical: coverage(
    data.catalog.specialties.map((s) => s.id),
    (id) => {
      const member = hospital.staff.find((s) => s.specialtyId === id && s.headcount > 0);
      return { present: Boolean(member), roundTheClock: member?.onCall24h ?? false, depth: (member?.headcount ?? 0) / SPECIALIST_DEPTH_TARGET };
    },
  ),
  facility: coverage(
    data.catalog.facilities.map((f) => f.id),
    (id) => {
      const item = hospital.facilities.find((f) => f.facilityId === id && f.qty > 0);
      return { present: Boolean(item), roundTheClock: item?.available24h ?? false, depth: (item?.qty ?? 0) / (FACILITY_DEPTH_TARGET[id] ?? 1) };
    },
  ),
  services: (CARE_CATEGORIES.filter((c) => (hospital.tariffBook?.categories[c] ?? 0) > 0).length / CARE_CATEGORIES.length) * 100,
  access: serviceAccess(hospital),
});

export const compositeOf = (scores: Scores) =>
  scores.clinical * WEIGHTS.clinical + scores.facility * WEIGHTS.facility + scores.services * WEIGHTS.services + scores.access * WEIGHTS.access;

export type PriceLevel = "murah" | "wajar" | "mahal";
export type ServiceLevel = "lengkap" | "cukup" | "terbatas";

/** A rating in words, with the one line that explains it. */
export type Rating<Level> = { level: Level; reason: string };

const PRICE_BY_TIER: Record<Tier, PriceLevel> = { A: "murah", B: "wajar", C: "mahal" };
const SERVICE_BY_TIER: Record<Tier, ServiceLevel> = { A: "lengkap", B: "cukup", C: "terbatas" };

/** 1 for the best place, 0 for the last; 1 when there is nothing to compare with. */
const percentile = ({ rank, of }: Placing) => (of === 1 ? 1 : 1 - (rank - 1) / (of - 1));

const priceReason = ({ ratio, compared }: { ratio: number; compared: number }) => {
  const share = Math.round(Math.abs(1 - ratio) * 100);
  const position = share === 0 ? "Setara RS lain" : `${share}% ${ratio < 1 ? "di bawah" : "di atas"} RS lain`;
  return `${position}, dari ${compared} layanan yang sama`;
};

const serviceReason = (hospital: Hospital) => {
  const covered = CARE_CATEGORIES.filter((c) => (hospital.tariffBook?.categories[c] ?? 0) > 0).length;
  const igd = hospital.facilities.some((f) => f.facilityId === "igd");
  return [`${covered} dari ${CARE_CATEGORIES.length} jenis layanan`, igd && "IGD"].filter(Boolean).join(" · ");
};

export type HospitalSummary = {
  hospital: Hospital;
  /** The parts of the Layanan rating. */
  scores: Scores;
  /** Prices against the other hospitals'; null until another hospital's document shares rows with its. */
  price: Rating<PriceLevel> | null;
  services: Rating<ServiceLevel>;
  /** Harga and Layanan together, 0–100 by place among the hospitals: what the rank and tier come from. */
  composite: number;
  /** Against every hospital with a published document; null until this one has one. */
  tier: Tier | null;
  placing: Placing | null;
  dataExpired: boolean;
};

/**
 * Every hospital rated against the others, like Bluebook's price and quality lights: Harga by its
 * prices on rows other hospitals' documents name the same way, Layanan by what its document shows it
 * offers. Each is split into thirds; the rank and tier weigh the two equally (Layanan alone until
 * prices can be compared).
 */
export const allSummaries = (data: Dataset): HospitalSummary[] => {
  const published = data.hospitals.filter((h) => h.tariffBook);
  const scores = new Map(data.hospitals.map((h) => [h, generalScores(h, data)]));
  const pricePlaces = placings(
    published.filter((h) => h.priceIndex),
    (h) => 100 / (h.priceIndex?.ratio ?? 1),
  );
  const servicePlaces = placings(published, (h) => compositeOf(scores.get(h) ?? generalScores(h, data)));

  const rated = data.hospitals.map((hospital) => {
    const pricePlace = pricePlaces.get(hospital);
    const servicePlace = servicePlaces.get(hospital);
    const parts = [pricePlace, servicePlace].filter((p): p is Placing => p !== undefined).map(percentile);
    return {
      hospital,
      scores: scores.get(hospital) ?? generalScores(hospital, data),
      price: pricePlace && hospital.priceIndex ? { level: PRICE_BY_TIER[pricePlace.tier], reason: priceReason(hospital.priceIndex) } : null,
      services: { level: SERVICE_BY_TIER[servicePlace?.tier ?? "C"], reason: serviceReason(hospital) },
      composite: parts.length ? (parts.reduce((sum, p) => sum + p, 0) / parts.length) * 100 : 0,
      dataExpired: isExpired(hospital),
    };
  });
  const overall = placings(
    rated.filter((r) => r.hospital.tariffBook),
    (r) => r.composite,
  );
  return rated.map((r) => {
    const placing = overall.get(r) ?? null;
    return { ...r, tier: placing?.tier ?? null, placing };
  });
};

export const summarize = (hospital: Hospital, data: Dataset): HospitalSummary => {
  const summary = allSummaries(data).find((s) => s.hospital.id === hospital.id);
  if (!summary) throw new Error(`Hospital ${hospital.id} is not in the dataset`);
  return summary;
};

// ------------------------------------------------------------------ searching for a treatment

/** A hospital that has what was searched for: its closest row, and how it compares. */
export type TreatmentMatch = {
  summary: HospitalSummary;
  /** The row that names the treatment most plainly; the others are counted. */
  line: TariffLine & { priceMin: number; priceMax: number };
  otherRows: number;
  priceMid: number;
  medianPrice: number;
  /** Positive when cheaper than the median, as a share of it. */
  savingVsMedian: number;
  locality: Locality;
  composite: number;
  /** Against the other hospitals that have it. */
  tier: Tier;
  placing: Placing;
  strengths: string[];
  notes: string[];
};

// Price against the median: ratio 0.7 → 100, 1.0 → 62.5, 1.5 → 0.
const costScore = (priceRatio: number) => clamp(((1.5 - priceRatio) / 0.8) * 100);

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

type PricedLine = TariffLine & { bookId: string; priceMin: number; priceMax: number };

const isPriced = (line: TariffLine & { bookId: string }): line is PricedLine => line.priceMin !== null && line.priceMax !== null;

const midOf = (line: { priceMin: number; priceMax: number }) => (line.priceMin + line.priceMax) / 2;

/**
 * Ranks the hospitals whose current document has rows found for a search: their general
 * score, the price of their plainest matching row against the other hospitals', and how near.
 */
export const rankForTreatment = (lines: (TariffLine & { bookId: string })[], origin: Origin, data: Dataset): TreatmentMatch[] => {
  const priced = lines.filter(isPriced);
  const found = data.hospitals.flatMap((hospital) => {
    const own = priced
      .filter((l) => l.bookId === hospital.tariffBook?.id)
      .sort((a, b) => wordCount(a.rawName) - wordCount(b.rawName) || a.priceMin - b.priceMin);
    return own.length ? [{ hospital, line: own[0], otherRows: own.length - 1 }] : [];
  });
  if (found.length === 0) return [];
  const medianPrice = median(found.map((f) => midOf(f.line)));
  const summaries = allSummaries(data);

  const matches = found.map(({ hospital, line, otherRows }) => {
      const summary = summaries.find((s) => s.hospital.id === hospital.id) ?? summarize(hospital, data);
      const priceMid = midOf(line);
      const savingVsMedian = (medianPrice - priceMid) / medianPrice;
      const locality = localityOf(hospital, origin);
      const access = 0.6 * LOCALITY_SCORE[locality] + 0.4 * serviceAccess(hospital);
      const composite = 0.4 * summary.composite + 0.35 * costScore(priceMid / medianPrice) + 0.25 * access;

      const strengths: string[] = [];
      const notes: string[] = [];
      if (savingVsMedian >= 0.1) strengths.push(`Tarif ${Math.round(savingVsMedian * 100)}% di bawah median`);
      if (locality === "kota") strengths.push(`Di ${origin.city}`);
      if (hospital.facilities.some((f) => f.facilityId === "igd" && f.available24h)) strengths.push("IGD 24 jam");
      if (savingVsMedian <= -0.15) notes.push(`Tarif ${Math.round(-savingVsMedian * 100)}% di atas median`);
      if (locality === "lain") notes.push("Di luar provinsi");
      if (summary.dataExpired) notes.push("Data tarif kedaluwarsa");

      return { summary, line, otherRows, priceMid, medianPrice, savingVsMedian, locality, composite, strengths, notes };
    });
  const placed = placings(matches, (m) => m.composite);
  return matches
    .flatMap((m): TreatmentMatch[] => {
      const placing = placed.get(m);
      return placing ? [{ ...m, tier: placing.tier, placing }] : [];
    })
    .sort((a, b) => a.placing.rank - b.placing.rank || b.composite - a.composite);
};

/**
 * One treatment's price against its harga wajar (the median across hospitals), in Bluebook's bands:
 * at or under it is murah, up to 20% over is wajar, more is mahal.
 */
export const fairPriceLevel = (savingVsMedian: number): PriceLevel =>
  savingVsMedian >= 0 ? "murah" : savingVsMedian >= -0.2 ? "wajar" : "mahal";
