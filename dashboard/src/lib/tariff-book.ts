import { CARE_CATEGORIES } from "./categories";
import type { Hospital, TariffBook } from "./data/types";

export type Completeness = { label: string; complete: boolean; detail: string }[];

/** The year a document prints for its tariffs; null when it prints none. */
export const bookYear = (book: TariffBook | null): number | null => (book?.validFrom ? new Date(book.validFrom).getFullYear() : null);

/** "Tahun 2025", or that the document prints none. */
export const bookYearLabel = (book: TariffBook) => {
  const year = bookYear(book);
  return year ? `Tahun ${year}` : "Tahun tidak tercetak di dokumen";
};

/** Which inputs the scores rest on, and which of them are missing. */
export const dataCompleteness = (hospital: Hospital, rowStats: { total: number; needsCheck: number } | null): Completeness => {
  const book = hospital.tariffBook;
  const services = CARE_CATEGORIES.filter((c) => (book?.categories[c] ?? 0) > 0).length;
  return [
    {
      label: "Data tarif",
      complete: book !== null,
      detail: !book ? "Belum ada data tarif terbit" : bookYearLabel(book),
    },
    {
      label: "Baris tarif terbaca jelas",
      complete: rowStats !== null && rowStats.needsCheck === 0,
      detail: rowStats ? `${rowStats.needsCheck} dari ${rowStats.total} baris kurang jelas di PDF` : "Belum ada data tarif terbit",
    },
    {
      label: "Tarif untuk semua jenis layanan",
      complete: services === CARE_CATEGORIES.length,
      detail: `${services} dari ${CARE_CATEGORIES.length} jenis layanan`,
    },
    { label: "Data fasilitas", complete: hospital.facilities.length > 0, detail: `${hospital.facilities.length} fasilitas tercatat` },
    { label: "Data tenaga medis", complete: hospital.staff.length > 0, detail: `${hospital.staff.length} spesialisasi tercatat` },
  ];
};
