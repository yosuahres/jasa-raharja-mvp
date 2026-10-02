import type { CategoryId } from "@/lib/categories";

export type Tier = "A" | "B" | "C";

export type Facility = {
  id: string;
  name: string;
  category: "gawat-darurat" | "operasi" | "rawat" | "radiologi" | "penunjang" | "transport";
  /** Other ways tariff documents write it, for detecting it in their rows. */
  keywords: string[];
};

export type Specialty = {
  id: string;
  name: string;
  keywords: string[];
};

/** One price cell of a tariff row, as printed. */
export type TariffPrice = {
  /** Column label, e.g. "TARIF BARU / EKSEKUTIF". */
  kelas: string;
  rawPrice: string;
  /** Rupiah; null when the cell isn't a plain number. */
  amount: number | null;
  /** An old price ("TARIF LAMA") printed beside the new one. */
  superseded: boolean;
};

/** A row as the extractor read it from the tariff document. */
export type TariffLine = {
  id: string;
  position: number;
  page: number;
  section: string | null;
  parents: string[];
  itemNo: string | null;
  rawName: string;
  unit: string | null;
  /** Unpriced lines listed under this row, sharing its price. */
  members: string[];
  /** Things the extractor could not read with certainty; see FLAG_LABEL. */
  flags: string[];
  category: CategoryId;
  prices: TariffPrice[];
  /** Lowest and highest current price on the row; null when none is a plain number. */
  priceMin: number | null;
  priceMax: number | null;
};

export type HospitalFacility = {
  facilityId: string;
  qty: number;
  available24h: boolean;
};

export type HospitalStaff = {
  specialtyId: string;
  headcount: number;
  onCall24h: boolean;
};

export type BookStatus = "queued" | "extracting" | "review" | "published" | "failed";

/** A catalog facility or specialty the extractor found in a document, with the first text it matched. */
export type Detection = { id: string; rows: number; page: number; evidence: string };

/** How many rows a document has in each category. */
export type CategoryCounts = Partial<Record<CategoryId, number>>;

/** A published tariff document. */
export type TariffBook = {
  id: string;
  version: string;
  /** Null when the document doesn't print its year. */
  validFrom: string | null;
  validTo: string | null;
  source: string;
  categories: CategoryCounts;
  rows: number;
};

/** A profile field the extractor read, with where it read it. */
export type DetectedField<T> = { value: T; source: string };

/** What the extractor read about the hospital; a field the document doesn't print is absent. */
export type DetectedProfile = {
  name?: DetectedField<string>;
  city?: DetectedField<string>;
  province?: DetectedField<string>;
  year?: DetectedField<number>;
  address?: DetectedField<string>;
  kelas?: DetectedField<NonNullable<Hospital["kelas"]>>;
  ownership?: DetectedField<NonNullable<Hospital["ownership"]>>;
  partner?: DetectedField<boolean>;
};

/** A hospital heading in the document, for a regulation that lists many. */
export type DocumentHospital = { heading: string; name: string; pages: number };

export type Hospital = {
  id: string;
  name: string;
  /** Null when its document doesn't print it. */
  kelas: "A" | "B" | "C" | "D" | null;
  ownership: "Pemerintah" | "Swasta" | "BUMN" | "TNI/Polri" | null;
  /** As the document prints them; empty when it doesn't. */
  city: string;
  province: string;
  address: string;
  partner: boolean;
  beds: number;
  facilities: HospitalFacility[];
  staff: HospitalStaff[];
  /**
   * Its prices against other hospitals' on rows named the same way: ratio 0.92 is 8% cheaper than
   * their median, over `compared` rows. Null until another hospital's document shares rows with its.
   */
  priceIndex: { ratio: number; compared: number } | null;
  /** The latest published document; null until one is published. */
  tariffBook: TariffBook | null;
  /** The published document before it. */
  previousBook: TariffBook | null;
};

/** What the system recognises in documents. */
export type Catalog = {
  facilities: Facility[];
  specialties: Specialty[];
};

/** Everything the scores are computed from. */
export type Dataset = {
  catalog: Catalog;
  hospitals: Hospital[];
};
