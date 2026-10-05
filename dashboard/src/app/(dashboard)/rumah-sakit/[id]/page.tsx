import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DataOverview } from "@/components/hospital/data-overview";
import { DetailPane } from "@/components/hospital/detail-pane";
import { DetailTabs } from "@/components/hospital/detail-tabs";
import { ProfileSidebar } from "@/components/hospital/profile-sidebar";
import { facilityItems, ResourceList, staffItems } from "@/components/hospital/resources";
import { TARIFF_PAGE_SIZE, TariffLinesTable } from "@/components/hospital/tariff-book";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { getBookLines, getBookRowStats, getDataset } from "@/lib/data/queries";
import type { Dataset, Hospital } from "@/lib/data/types";
import { allSummaries, summarize } from "@/lib/scoring";
import { dataCompleteness } from "@/lib/tariff-book";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The best-scoring other hospital in the same city, else the best overall: the natural one to compare against. */
const comparisonPeer = (hospital: Hospital, data: Dataset) => {
  const others = allSummaries(data)
    .filter((s) => s.hospital.id !== hospital.id && s.tipe !== null)
    .sort((a, b) => b.composite - a.composite);
  return (others.find((s) => s.hospital.city === hospital.city) ?? others[0])?.hospital;
};

export async function generateMetadata({ params }: PageProps<"/rumah-sakit/[id]">): Promise<Metadata> {
  const { id } = await params;
  const hospital = (await getDataset()).hospitals.find((h) => h.id === id);
  if (!hospital) return { title: "Rumah Sakit" };
  return {
    title: hospital.name,
    description: `Profil, tarif, dan fasilitas ${hospital.name}${hospital.city ? `, ${hospital.city}` : ""}`,
  };
}

export default async function HospitalPage({ params, searchParams }: PageProps<"/rumah-sakit/[id]">) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const data = await getDataset();
  const hospital = data.hospitals.find((h) => h.id === id);
  if (!hospital) notFound();

  const category: CategoryId | undefined = CATEGORIES.find((c) => c.id === first(search.kategori))?.id;
  const query = (first(search.cari) ?? "").trim();
  const page = Math.max(1, Number(first(search.hal)) || 1);

  const book = hospital.tariffBook;
  const [lines, rowStats] = book
    ? await Promise.all([
        getBookLines(book.id, { category, query, limit: TARIFF_PAGE_SIZE, offset: (page - 1) * TARIFF_PAGE_SIZE }),
        getBookRowStats(book.id),
      ])
    : [null, null];

  const summary = summarize(hospital, data);
  const completeness = dataCompleteness(hospital, rowStats);
  const facilities = facilityItems(hospital, data.catalog);
  const staff = staffItems(hospital, data.catalog);

  return (
    <DetailPane sidebar={<ProfileSidebar summary={summary} peer={comparisonPeer(hospital, data)} completeness={completeness} />}>
      <DetailTabs
        defaultTab={category || query || page > 1 ? "tarif" : "overview"}
        counts={{
          tarif: book ? { value: book.rows, label: "baris tarif" } : undefined,
          fasilitas: { value: facilities.filter((f) => f.present).length, label: "fasilitas tersedia" },
          "tenaga-medis": { value: staff.filter((s) => s.present).length, label: "spesialis tersedia" },
        }}
        panels={{
          overview: <DataOverview hospital={hospital} completeness={completeness} expired={summary.dataExpired} />,
          tarif:
            book && lines ? (
              <TariffLinesTable book={book} lines={lines.lines} total={lines.total} category={category} query={query} page={page} />
            ) : (
              <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">Belum ada data</p>
            ),
          fasilitas: <ResourceList items={facilities} roundTheClockLabel="24 jam" />,
          "tenaga-medis": <ResourceList items={staff} roundTheClockLabel="On-call 24 jam" />,
        }}
      />
    </DetailPane>
  );
}
