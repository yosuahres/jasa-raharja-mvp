import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TariffImportFlow } from "@/components/input/tariff-import-flow";
import { getDataset, getUnfinishedUploads } from "@/lib/data/queries";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: PageProps<"/rumah-sakit/[id]/perbarui">): Promise<Metadata> {
  const { id } = await params;
  const hospital = (await getDataset()).hospitals.find((h) => h.id === id);
  return { title: hospital ? `Perbarui tarif ${hospital.name}` : "Perbarui tarif" };
}

/** A new version of one hospital's tariffs: the upload flow, bound to the hospital and compared with what it has. */
export default async function UpdateTariffPage({ params, searchParams }: PageProps<"/rumah-sakit/[id]/perbarui">) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const [data, unfinished] = await Promise.all([getDataset(), getUnfinishedUploads()]);
  const hospital = data.hospitals.find((h) => h.id === id);
  if (!hospital) notFound();
  const bookId = first(search.tarif) ?? null;

  return (
    // Keyed by the upload, so opening another one starts its flow fresh.
    <TariffImportFlow
      key={bookId ?? "new"}
      hospitals={data.hospitals.map((h) => ({ id: h.id, name: h.name }))}
      unfinished={unfinished.filter((u) => u.hospitalId === hospital.id && u.id !== bookId)}
      initialBookId={bookId}
      update={{
        hospital: { id: hospital.id, name: hospital.name },
        book: hospital.tariffBook,
        facilities: hospital.facilities.length,
        staff: hospital.staff.length,
      }}
    />
  );
}
