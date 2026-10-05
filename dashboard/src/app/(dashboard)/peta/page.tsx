import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";

import { HospitalMapView } from "@/components/map/hospital-map-view";
import { PageHero } from "@/components/page-hero";
import { UrlSelect } from "@/components/url-select";
import { getDataset } from "@/lib/data/queries";
import { geocodeMissing } from "@/lib/geocode";
import { allSummaries } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Peta Rumah Sakit",
  description: "Lokasi rumah sakit pada peta",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const TIPE_OPTIONS = [
  { value: "", label: "Semua tipe" },
  { value: "A", label: "Tipe A" },
  { value: "B", label: "Tipe B" },
  { value: "C", label: "Tipe C" },
  { value: "D", label: "Tipe D" },
];

export default async function MapPage({ searchParams }: PageProps<"/peta">) {
  const params = await searchParams;
  const city = first(params.kota) ?? "";
  const tipe = first(params.tipe) ?? "";

  // Hospitals saved before the map existed, or whose address changed, get their pins a few at a time.
  // The client is made here: cookies can't be read once the response has gone.
  const supabase = await createClient();
  after(() => geocodeMissing(supabase));

  const summaries = allSummaries(await getDataset());
  const cities = [...new Set(summaries.map((s) => s.hospital.city).filter(Boolean))].sort();
  const shown = summaries
    .filter((s) => !city || s.hospital.city === city)
    .filter((s) => !tipe || s.tipe === tipe)
    .sort((a, b) => (a.placing?.rank ?? Infinity) - (b.placing?.rank ?? Infinity));
  const filtered = Boolean(city || tipe);

  const pins = shown.flatMap(({ hospital: h, tipe }) =>
    h.location ? [{ id: h.id, name: h.name, city: h.city, tipe, ...h.location }] : [],
  );
  const unplaced = shown.filter((s) => !s.hospital.location).map(({ hospital: h }) => ({ id: h.id, name: h.name, city: h.city }));

  return (
    <>
      <PageHero title="Peta Rumah Sakit">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[12rem_12rem]">
          <Suspense fallback={<FieldPlaceholder label="Kota" />}>
            <UrlSelect
              param="kota"
              label="Kota"
              value={city}
              options={[{ value: "", label: "Semua kota" }, ...cities.map((c) => ({ value: c, label: c }))]}
            />
          </Suspense>
          <Suspense fallback={<FieldPlaceholder label="Tipe" />}>
            <UrlSelect param="tipe" label="Tipe" value={tipe} options={TIPE_OPTIONS} />
          </Suspense>
        </div>
      </PageHero>

      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-7 sm:px-8">
        {filtered && (
          <div className="mb-2 flex justify-end text-xs">
            <Link href="/peta" replace scroll={false} className="font-medium text-foreground underline-offset-4 hover:underline">
              Hapus filter
            </Link>
          </div>
        )}

        {summaries.length === 0 ? (
          <p className="py-14 text-center font-medium">Belum ada data</p>
        ) : shown.length === 0 ? (
          <p className="py-14 text-center font-medium">Tidak ada rumah sakit yang cocok</p>
        ) : (
          <HospitalMapView pins={pins} unplaced={unplaced} />
        )}
      </div>
    </>
  );
}

function FieldPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("grid gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      {label}
      <div className="h-9 rounded-lg bg-muted" />
    </div>
  );
}
