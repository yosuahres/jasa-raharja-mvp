// The kinds of service every tariff row is filed under, as the extractor decides them
// (extractor/app/categories.py). Ids must match; this is the display order.
export const CATEGORIES = [
  { id: "operatif", label: "Tindakan operatif" },
  { id: "tindakan", label: "Tindakan non-operatif" },
  { id: "igd", label: "Gawat darurat (IGD)" },
  { id: "kamar", label: "Kamar & rawat inap" },
  { id: "konsultasi", label: "Konsultasi & visite" },
  { id: "laboratorium", label: "Laboratorium" },
  { id: "radiologi", label: "Radiologi" },
  { id: "rehabilitasi", label: "Rehabilitasi medik" },
  { id: "obat", label: "Obat & bahan habis pakai" },
  { id: "administrasi", label: "Administrasi" },
  { id: "lainnya", label: "Lainnya" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/** The categories that say what care a hospital gives, for how complete its services are. */
export const CARE_CATEGORIES: CategoryId[] = ["operatif", "tindakan", "igd", "kamar", "konsultasi", "laboratorium", "radiologi", "rehabilitasi"];

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Lainnya";
