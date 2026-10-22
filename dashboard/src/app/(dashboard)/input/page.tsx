import type { Metadata } from "next";

import { InputKindStep } from "@/components/input/input-kind";
import { TariffImportFlow } from "@/components/input/tariff-import-flow";
import { ImportShell } from "@/components/input/import-shell";
import { JrListFlow } from "@/components/jasa-raharja/jr-list-flow";
import { JR_LIST_STEPS } from "@/components/jasa-raharja/jr-list-steps";
import { JrListSection, loketsOf } from "@/components/jasa-raharja/jr-list-section";
import { getHospitals, getJrHospitals, getUnfinishedUploads } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "Input Data",
  description: "Unggah dokumen tarif rumah sakit atau daftar RS Jasa Raharja",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Step 1 picks the kind of data; `jenis` carries the choice into the upload steps. An unfinished
 * tariff upload (`tarif`) is a tariff document, whatever step it was left at.
 */
export default async function UploadPage({ searchParams }: PageProps<"/input">) {
  const params = await searchParams;
  const bookId = first(params.tarif) ?? null;
  const kind = bookId ? "tarif" : first(params.jenis);
  const [hospitals, unfinished, jrHospitals] = await Promise.all([getHospitals(), getUnfinishedUploads(), getJrHospitals()]);

  if (kind === "daftar-rs") {
    if (first(params.tahap) === "periksa") {
      return (
        <ImportShell crumb="Upload daftar RS Jasa Raharja" steps={JR_LIST_STEPS} current={3}>
          <JrListSection list={jrHospitals} hospitals={hospitals} />
        </ImportShell>
      );
    }
    return <JrListFlow current={jrHospitals.length > 0 ? { hospitals: jrHospitals.length, lokets: loketsOf(jrHospitals).length } : null} />;
  }

  if (kind === "tarif") {
    return (
      // Keyed by the upload, so opening another one starts its flow fresh.
      <TariffImportFlow
        key={bookId ?? "new"}
        hospitals={hospitals.map((h) => ({ id: h.id, name: h.name }))}
        jrHospitals={jrHospitals}
        unfinished={unfinished.filter((u) => u.id !== bookId)}
        initialBookId={bookId}
      />
    );
  }

  return <InputKindStep />;
}
