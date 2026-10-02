import { CARE_CATEGORIES } from "./categories";
import type { Hospital } from "./data/types";
import { formatDate } from "./format";

export type Completeness = { label: string; complete: boolean; detail: string }[];

/** Which inputs the scores rest on, and which of them are missing or stale. */
export const dataCompleteness = (
  hospital: Hospital,
  rowStats: { total: number; needsCheck: number } | null,
  today = new Date(),
): Completeness => {
  const book = hospital.tariffBook;
  const services = CARE_CATEGORIES.filter((c) => (book?.categories[c] ?? 0) > 0).length;
  return [
    {
      label: "Data tarif berlaku",
      complete: book?.validTo != null && new Date(book.validTo) >= today,
      detail: !book ? "Belum ada data tarif terbit" : book.validTo ? `s.d. ${formatDate(book.validTo)}` : "Tahun tidak tercetak di dokumen",
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
