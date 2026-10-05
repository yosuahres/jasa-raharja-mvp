import type { Metadata } from "next";

import { CompareSelectionProvider } from "@/components/compare-selection";
import { type HospitalRow, parseQuery } from "@/components/hospitals/hospital-list";
import { HospitalTable } from "@/components/hospitals/hospital-table";
import { getDataset } from "@/lib/data/queries";
import { formatDate } from "@/lib/format";
import type { HospitalSummary } from "@/lib/scoring";
import { allSummaries, compositeOf } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Rumah Sakit",
  description: "Daftar rumah sakit beserta tipenya",
};

const toRow = ({ hospital, tipe, price, services, scores, dataExpired }: HospitalSummary): HospitalRow => ({
  id: hospital.id,
  name: hospital.name,
  city: hospital.city,
  ownership: hospital.ownership,
  partner: hospital.partner,
  tipe,
  price: price && hospital.priceIndex ? { ...price, ratio: hospital.priceIndex.ratio } : null,
  services: { ...services, score: compositeOf(scores) },
  tariff: !hospital.tariffBook ? "belum-ada" : dataExpired ? "kedaluwarsa" : "berlaku",
  validTo: hospital.tariffBook?.validTo ?? null,
  validToLabel: formatDate(hospital.tariffBook?.validTo ?? null),
});

export default async function HospitalsPage({ searchParams }: PageProps<"/rumah-sakit">) {
  const params = await searchParams;
  const initial = parseQuery((param) => [params[param] ?? []].flat());

  const summaries = allSummaries(await getDataset());
  // In rank order; hospitals without a published document go last. The table keeps this order unless sorted.
  const rows = [...summaries].sort((a, b) => (a.placing?.rank ?? Infinity) - (b.placing?.rank ?? Infinity)).map(toRow);

  // Full page, like the CRM tables it follows: the app header already names the page, then the table.
  return (
    <CompareSelectionProvider>
      {/* A link to this page with other params starts the table afresh from them. */}
      <HospitalTable key={JSON.stringify(initial)} rows={rows} initial={initial} />
    </CompareSelectionProvider>
  );
}
