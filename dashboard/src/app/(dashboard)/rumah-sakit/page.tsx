import { FileUp } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CompareCheckbox, CompareSelectionProvider } from "@/components/compare-selection";
import { PageHero } from "@/components/page-hero";
import { MethodNote, RatingPill } from "@/components/rating";
import { TierBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UrlSearchInput } from "@/components/url-search-input";
import { UrlSelect } from "@/components/url-select";
import { getDataset } from "@/lib/data/queries";
import { formatDate, joinFacts, kelasLabel } from "@/lib/format";
import type { HospitalSummary } from "@/lib/scoring";
import { allSummaries } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const TIER_OPTIONS = [
  { value: "", label: "Semua tier" },
  { value: "A", label: "Tier A · Preferred" },
  { value: "B", label: "Tier B · Standard" },
  { value: "C", label: "Tier C · Selective" },
];

const COLUMNS = 7;

export default async function HospitalsPage({ searchParams }: PageProps<"/rumah-sakit">) {
  const params = await searchParams;
  const city = first(params.kota) ?? "";
  const tier = first(params.tier) ?? "";
  const rawQuery = first(params.q) ?? "";
  const query = rawQuery.trim().toLowerCase();

  const summaries = allSummaries(await getDataset());
  const cities = [...new Set(summaries.map((s) => s.hospital.city))].sort();
  const rows = summaries
    .filter((s) => !city || s.hospital.city === city)
    .filter((s) => !tier || s.tier === tier)
    .filter((s) => !query || `${s.hospital.name} ${s.hospital.city}`.toLowerCase().includes(query))
    // In rank order; hospitals without a published document go last.
    .sort((a, b) => (a.placing?.rank ?? Infinity) - (b.placing?.rank ?? Infinity));
  const filtered = Boolean(city || tier || query);

  return (
    <>
      <PageHero
        title="Rumah Sakit"
        actions={
          <Link href="/input" className={buttonVariants({ size: "sm" })}>
            <FileUp />
            Upload dokumen
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,22rem)_12rem_12rem]">
          <Suspense fallback={<FieldPlaceholder label="Cari" className="col-span-2 md:col-span-1" />}>
            <UrlSearchInput
              param="q"
              label="Cari"
              value={rawQuery}
              placeholder="Nama rumah sakit atau kota"
              className="col-span-2 md:col-span-1"
            />
          </Suspense>
          <Suspense fallback={<FieldPlaceholder label="Kota" />}>
            <UrlSelect
              param="kota"
              label="Kota"
              value={city}
              options={[{ value: "", label: "Semua kota" }, ...cities.map((c) => ({ value: c, label: c }))]}
            />
          </Suspense>
          <Suspense fallback={<FieldPlaceholder label="Tier" />}>
            <UrlSelect param="tier" label="Tier" value={tier} options={TIER_OPTIONS} />
          </Suspense>
        </div>
      </PageHero>

      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-8 sm:px-8">
        {filtered && (
          <div className="mb-2 flex justify-end text-xs">
            <Link href="/rumah-sakit" replace scroll={false} className="font-medium text-foreground underline-offset-4 hover:underline">
              Hapus filter
            </Link>
          </div>
        )}

        <CompareSelectionProvider hospitals={summaries.map((s) => ({ id: s.hospital.id, name: s.hospital.name }))}>
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent [&>th]:h-11">
                  <TableHead className="w-12 pl-4">
                    <span className="sr-only">Bandingkan</span>
                  </TableHead>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Rumah sakit</TableHead>
                  <TableHead className="hidden md:table-cell">Harga</TableHead>
                  <TableHead className="hidden md:table-cell">Layanan</TableHead>
                  <TableHead className="hidden lg:table-cell">Data tarif</TableHead>
                  <TableHead className="pr-4">Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <HospitalRow key={s.hospital.id} summary={s} />
                ))}
                {rows.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNS} className="py-14 text-center whitespace-normal">
                      {summaries.length === 0 ? (
                        <>
                          <p className="font-medium">Belum ada rumah sakit</p>
                          <p className="mt-1 text-muted-foreground">
                            <Link href="/input" className="font-medium text-foreground underline underline-offset-4">
                              Upload dokumen tarif
                            </Link>{" "}
                            untuk menambahkan rumah sakit.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">Tidak ada rumah sakit yang cocok</p>
                          <p className="mt-1 text-muted-foreground">Coba kata kunci lain atau longgarkan filter kota dan tier.</p>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          <MethodNote className="mt-3" />
        </CompareSelectionProvider>
      </div>
    </>
  );
}

function HospitalRow({ summary }: { summary: HospitalSummary }) {
  const { hospital } = summary;

  return (
    // The name link stretches over the row; only the checkbox sits above it.
    <TableRow className="relative has-checked:bg-muted/60 has-[a:focus-visible]:bg-muted/60">
      <TableCell className="py-3 pl-4">
        <CompareCheckbox id={hospital.id} name={hospital.name} />
      </TableCell>
      <TableCell className="py-3 font-semibold tabular-nums">{summary.placing?.rank ?? "—"}</TableCell>
      <TableCell className="min-w-48 py-3 whitespace-normal">
        <Link
          href={`/rumah-sakit/${hospital.id}`}
          className="font-medium underline-offset-4 outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
        >
          {hospital.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {joinFacts(hospital.city, kelasLabel(hospital.kelas), hospital.ownership)}
          {!hospital.partner && <span className="text-tier-c-ink"> · Belum mitra</span>}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 md:hidden">
          <RatingPill level={summary.price?.level ?? null} />
          <RatingPill level={summary.services.level} />
        </div>
      </TableCell>
      <TableCell className="hidden py-3 md:table-cell">
        <RatingPill level={summary.price?.level ?? null} />
        {summary.price && <p className="mt-0.5 text-xs text-muted-foreground">{summary.price.reason}</p>}
      </TableCell>
      <TableCell className="hidden py-3 md:table-cell">
        <RatingPill level={summary.services.level} />
        <p className="mt-0.5 text-xs text-muted-foreground">{summary.services.reason}</p>
      </TableCell>
      <TableCell className="hidden py-3 text-xs lg:table-cell">
        {hospital.tariffBook ? (
          <p className={summary.dataExpired ? "font-medium text-tier-c-ink" : "text-muted-foreground"}>
            {summary.dataExpired ? "Kedaluwarsa" : "Berlaku s.d."} {formatDate(hospital.tariffBook.validTo)}
          </p>
        ) : (
          <p className="font-medium text-tier-c-ink">Belum ada data tarif</p>
        )}
      </TableCell>
      <TableCell className="py-3 pr-4">{summary.tier ? <TierBadge tier={summary.tier} /> : <span className="text-muted-foreground">—</span>}</TableCell>
    </TableRow>
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
