import { ChevronLeft, GitCompareArrows, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccidentSearch } from "@/components/search/accident-search";
import { CaseResultCard } from "@/components/search/case-result-card";
import { FilterButton, ResetFiltersButton, SortButton } from "@/components/search/filter-bar";
import { applyFilters, countActiveFilters, factsOf, parseFilters, parseSort, type SortKey } from "@/components/search/filters";
import { ResultCard } from "@/components/search/result-card";
import { toSearchResult } from "@/components/search/results";
import { buttonVariants } from "@/components/ui/button";
import { type AccidentCase, accidentCaseKeys, findAccidentCase } from "@/lib/accident-cases";
import { getDataset, getTreatment, getTreatmentLines } from "@/lib/data/queries";
import { ALL_LOCATIONS, ALL_LOCATIONS_PARAM, LOCALITY_RANK, type Origin, originsOf, rankForCase, rankForTreatment, type TreatmentMatch } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Cari Rujukan",
  description: "Cari tindakan dan rumah sakit rujukan untuk korban kecelakaan berdasarkan kasus dan lokasi",
};

const MAX_COMPARE = 3;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// rankForTreatment() already returns the recommended order, so that sort is a no-op.
const SORT_COMPARE: Record<SortKey, (a: TreatmentMatch, b: TreatmentMatch) => number> = {
  rekomendasi: () => 0,
  harga: (a, b) => a.priceMid - b.priceMid,
  jarak: (a, b) => LOCALITY_RANK[a.locality] - LOCALITY_RANK[b.locality],
};

export default async function RecommendationPage({ searchParams }: PageProps<"/rekomendasi">) {
  const params = await searchParams;
  const key = first(params.tindakan);
  const accidentCase = findAccidentCase(first(params.kasus));
  const [data, treatment] = await Promise.all([getDataset(), key ? getTreatment(key) : null]);
  const origins = originsOf(data.hospitals);
  // A city the documents name, or "Semua lokasi" — also what an unknown or missing `lokasi` means.
  const origin = origins.length === 0 ? undefined : (origins.find((o) => o.city === first(params.lokasi)) ?? ALL_LOCATIONS);
  const lokasi = origin?.city || ALL_LOCATIONS_PARAM;

  const search = (compact: boolean) => (
    <AccidentSearch accidentCase={accidentCase} location={lokasi} cities={origins.map((o) => o.city)} compact={compact} />
  );

  if (!origin) {
    return (
      <Results search={search(true)}>
        <EmptyState title="Belum ada data" />
      </Results>
    );
  }

  const bookIds = data.hospitals.flatMap((h) => (h.tariffBook ? [h.tariffBook.id] : []));

  // An accident case: the hospitals for the whole case, each with the tindakan it prices.
  if (!treatment && accidentCase) {
    return (
      <Results search={search(true)}>
        <CaseRecommendation accidentCase={accidentCase} origin={origin} lokasi={lokasi} bookIds={bookIds} />
      </Results>
    );
  }

  // Nothing searched yet: the search sits alone in the middle of the page.
  if (!treatment) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-4 pt-10 pb-[12vh] sm:px-8 lg:min-h-[calc(100dvh-4rem)]">
        <div className="w-full max-w-4xl">
          {/* No title of its own: the app header names the page. */}
          {search(false)}
        </div>
      </div>
    );
  }

  // Reached from an accident case: a way back to its other tindakan.
  const back = accidentCase
    ? { href: `/rekomendasi?${new URLSearchParams({ kasus: accidentCase.id, lokasi })}`, label: accidentCase.name }
    : undefined;
  const ranked = rankForTreatment(await getTreatmentLines([treatment.key], bookIds), origin, data);
  if (ranked.length === 0) {
    return (
      <Results search={search(true)} back={back}>
        <EmptyState title={`Tidak ada tarif untuk "${treatment.name}"`} />
      </Results>
    );
  }

  const sort = parseSort(first(params.urut));
  const filters = parseFilters((key) => first(params[key]));
  const listed = [...applyFilters(ranked, filters)].sort(SORT_COMPARE[sort]);
  const results = listed.map(toSearchResult);
  const compareIds = ranked.slice(0, MAX_COMPARE).map((m) => m.summary.hospital.id);

  return (
    <Results search={search(true)} back={back}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Suspense>
            <FilterButton facts={ranked.map(factsOf)} />
            <SortButton />
          </Suspense>
        </div>
        {compareIds.length > 1 && (
          <Link
            href={`/bandingkan?rs=${compareIds.join(",")}&q=${encodeURIComponent(treatment.name)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <GitCompareArrows data-icon="inline-start" />
            Bandingkan {compareIds.length} teratas
          </Link>
        )}
      </div>

      {results.length > 0 ? (
        <ol className="mt-3 grid gap-3">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} treatmentName={treatment.name} />
          ))}
        </ol>
      ) : (
        <div className="mt-3">
          <EmptyState
            title="Tidak ada rumah sakit yang cocok"
            description={`${countActiveFilters(filters)} filter aktif menyaring semua ${ranked.length} rumah sakit.`}
          >
            <Suspense>
              <ResetFiltersButton />
            </Suspense>
          </EmptyState>
        </div>
      )}
    </Results>
  );
}

/** The hospitals ranked for a whole accident case, each holding the tindakan its document prices. */
async function CaseRecommendation({ accidentCase, origin, lokasi, bookIds }: { accidentCase: AccidentCase; origin: Origin; lokasi: string; bookIds: string[] }) {
  const [data, lines] = await Promise.all([getDataset(), getTreatmentLines(accidentCaseKeys(accidentCase), bookIds)]);
  const ranked = rankForCase(lines, accidentCase.steps, origin, data);
  const compareIds = ranked.slice(0, MAX_COMPARE).map((m) => m.summary.hospital.id);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h1 className="min-w-0 text-xl font-semibold tracking-tight text-balance">{accidentCase.name}</h1>
        {compareIds.length > 1 && (
          <Link href={`/bandingkan?rs=${compareIds.join(",")}`} className={buttonVariants({ variant: "outline" })}>
            <GitCompareArrows data-icon="inline-start" />
            Bandingkan {compareIds.length} teratas
          </Link>
        )}
      </div>

      {ranked.length > 0 ? (
        <ol className="mt-5 grid gap-3">
          {ranked.map((m) => (
            <CaseResultCard key={m.summary.hospital.id} match={m} caseId={accidentCase.id} location={lokasi} />
          ))}
        </ol>
      ) : (
        <div className="mt-5">
          <EmptyState title="Belum ada rumah sakit untuk kasus ini" />
        </div>
      )}
    </>
  );
}

/** After a search: the search in a bar on top, what it found below. */
function Results({ search, back, children }: { search: React.ReactNode; back?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <>
      <div className="z-20 border-b bg-background/95 backdrop-blur md:sticky md:top-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-8">{search}</div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-7 sm:px-8">
        {back && (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" />
            {back.label}
          </Link>
        )}
        {children}
      </div>
    </>
  );
}

function EmptyState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-balance">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
