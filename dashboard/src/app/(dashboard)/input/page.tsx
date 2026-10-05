import type { Metadata } from "next";

import { TariffImportFlow } from "@/components/input/tariff-import-flow";
import { getHospitals, getUnfinishedUploads } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "Input Data",
  description: "Unggah dokumen tarif rumah sakit",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function UploadPage({ searchParams }: PageProps<"/input">) {
  const bookId = first((await searchParams).tarif) ?? null;
  const [hospitals, unfinished] = await Promise.all([getHospitals(), getUnfinishedUploads()]);

  return (
    // Keyed by the upload, so opening another one starts its flow fresh.
    <TariffImportFlow
      key={bookId ?? "new"}
      hospitals={hospitals.map((h) => ({ id: h.id, name: h.name }))}
      unfinished={unfinished.filter((u) => u.id !== bookId)}
      initialBookId={bookId}
    />
  );
}
