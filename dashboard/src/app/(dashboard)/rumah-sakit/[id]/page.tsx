import { notFound } from "next/navigation";

import { DataCompleteness } from "@/components/hospital/data-completeness";
import { LocationCard } from "@/components/hospital/location-card";
import { ProviderHeader } from "@/components/hospital/provider-header";
import { Resources } from "@/components/hospital/resources";
import { TARIFF_PAGE_SIZE, TariffBookSource, TariffLinesTable } from "@/components/hospital/tariff-book";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { getBookLines, getBookRowStats, getDataset } from "@/lib/data/queries";
import type { Dataset, Hospital } from "@/lib/data/types";
import { allSummaries, summarize } from "@/lib/scoring";
import { dataCompleteness } from "@/lib/tariff-book";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The best-scoring other hospital in the same city, else the best overall: the natural one to compare against. */
const comparisonPeer = (hospital: Hospital, data: Dataset) => {
  const others = allSummaries(data)
    .filter((s) => s.hospital.id !== hospital.id && s.tier !== null)
    .sort((a, b) => b.composite - a.composite);
  return (others.find((s) => s.hospital.city === hospital.city) ?? others[0])?.hospital;
};

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
  const incomplete = completeness.filter((c) => !c.complete).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-7">
      <ProviderHeader summary={summary} peer={comparisonPeer(hospital, data)} />

      <Tabs defaultValue="tarif" className="mt-6 gap-4">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <TabsList aria-label="Bagian profil rumah sakit">
            <TabsTrigger value="tarif" className="flex-none px-3">
              Tarif
            </TabsTrigger>
            <TabsTrigger value="fasilitas" className="flex-none px-3">
              Fasilitas & tenaga medis
            </TabsTrigger>
            <TabsTrigger value="data" className="flex-none px-3">
              Data & lokasi
              {incomplete > 0 && <Count label="sumber data belum lengkap">{incomplete}</Count>}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tarif">
          {book && lines ? (
            <TariffLinesTable book={book} lines={lines.lines} total={lines.total} category={category} query={query} page={page} />
          ) : (
            <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">Belum ada data</p>
          )}
        </TabsContent>

        <TabsContent value="fasilitas">
          <Resources hospital={hospital} catalog={data.catalog} />
        </TabsContent>

        <TabsContent value="data">
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <DataCompleteness items={completeness} />
            <LocationCard hospital={hospital} />
            {book && <TariffBookSource book={book} previous={hospital.previousBook} expired={summary.dataExpired} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Count({ label, children }: { label: string; children: number }) {
  return (
    <span className="text-xs font-medium text-tier-c-ink tabular-nums">
      {children}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
