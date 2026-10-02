import { SearchX } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PriceRangeChart } from "@/components/charts/price-range-chart";
import { RatingPill } from "@/components/rating";
import { FilterBar, ResetFiltersButton } from "@/components/search/filter-bar";
import { applyFilters, countActiveFilters, parseFilters, parseSort, type SortKey, TIERS } from "@/components/search/filters";
import { ResultsExplorer } from "@/components/search/results-explorer";
import { medianDelta, toSearchResult } from "@/components/search/results";
import { TreatmentSearch } from "@/components/search/treatment-search";
import { TierBadge } from "@/components/tier-badge";
import { TreatmentSuggestions } from "@/components/search/treatment-suggestions";
import { getDataset, searchLines, searchNamesAny } from "@/lib/data/queries";
import type { Tier } from "@/lib/data/types";
import { formatJuta, formatRange, joinFacts } from "@/lib/format";
import { fairPriceLevel, LOCALITY_LABEL, LOCALITY_RANK, originsOf, rankForTreatment, type TreatmentMatch } from "@/lib/scoring";
import { treatmentVariants } from "@/lib/treatment-variants";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// rankForTreatment() already returns the recommended order, so that sort is a no-op.
const SORT_COMPARE: Record<SortKey, (a: TreatmentMatch, b: TreatmentMatch) => number> = {
  rekomendasi: () => 0,
  harga: (a, b) => a.priceMid - b.priceMid,
  jarak: (a, b) => LOCALITY_RANK[a.locality] - LOCALITY_RANK[b.locality],
};

export default async function RecommendationPage({ searchParams }: PageProps<"/rekomendasi">) {
  const params = await searchParams;
  const data = await getDataset();
  const query = (first(params.q) ?? "").trim();
  const origins = originsOf(data.hospitals);
  const origin = origins.find((o) => o.city === first(params.lokasi)) ?? origins[0];

  const hrefFor = (name: string) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = first(value);
      if (v !== undefined) next.set(key, v);
    }
    next.set("q", name);
    return `/rekomendasi?${next}`;
  };

  const renderHeader = (suggestions?: React.ReactNode) => (
    <section className="border-b px-4 py-7 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">Cari Rujukan</h1>
      <div className="mt-5">
        <TreatmentSearch query={query} location={origin?.city ?? ""} cities={origins.map((o) => o.city)} />
      </div>
      {suggestions}
    </section>
  );
  const header = renderHeader();

  if (!origin) {
    return (
      <>
        {header}
        <div className="px-4 py-7 sm:px-8">
          <EmptyState title="Belum ada data" />
        </div>
      </>
    );
  }
  if (!query) return header;

  const bookIds = data.hospitals.flatMap((h) => (h.tariffBook ? [h.tariffBook.id] : []));
  const lines = await searchLines(query, bookIds);
  const ranked = rankForTreatment(lines, origin, data);
  if (ranked.length === 0) {
    // Nothing has every word: offer the names that have some of them.
    const nearby = treatmentVariants(await searchNamesAny(query, bookIds), query);
    return (
      <>
        {renderHeader(
          nearby.length > 0 && <TreatmentSuggestions label="Mungkin maksud Anda" variants={nearby} query={query} hrefFor={hrefFor} />,
        )}
        <div className="px-4 py-7 sm:px-8">
          <EmptyState title={`Tidak ada tarif untuk "${query}"`} />
        </div>
      </>
    );
  }

  // Different treatments can share the search's words; picking one compares like with like.
  const variants = treatmentVariants(lines, query);

  const sort = parseSort(first(params.urut));
  const filters = parseFilters((key) => first(params[key]));
  const listed = [...applyFilters(ranked, filters)].sort(SORT_COMPARE[sort]);
  const results = listed.map((m) => toSearchResult(m, { rank: ranked.indexOf(m) + 1, recommended: m === ranked[0] }));
  const tierCounts = Object.fromEntries(TIERS.map((t) => [t, ranked.filter((m) => m.tier === t).length])) as Record<Tier, number>;
  const median = ranked[0].medianPrice;

  return (
    <>
      {renderHeader(
        variants.length > 1 && <TreatmentSuggestions label="Tindakan yang cocok" variants={variants} query={query} hrefFor={hrefFor} />,
      )}
      <Answer match={ranked[0]} query={query} />
      <Summary ranked={ranked} median={median} tierA={tierCounts.A} />

      <ResultsExplorer
        results={results}
        toolbar={
          <Suspense>
            <FilterBar tierCounts={tierCounts} />
          </Suspense>
        }
        empty={
          <EmptyState
            title="Tidak ada rumah sakit yang cocok"
            description={`${countActiveFilters(filters)} filter aktif menyaring semua ${ranked.length} rumah sakit.`}
            action={
              <Suspense>
                <ResetFiltersButton />
              </Suspense>
            }
          />
        }
      />

      <section className="px-4 py-7 sm:px-8">
        <h2 className="text-base font-semibold tracking-tight">Sebaran tarif</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Tarif minimum–maksimum per rumah sakit. Garis tegak adalah median.</p>
        <div className="mt-4">
          <PriceRangeChart
            median={median}
            data={ranked.map((m) => ({ name: m.summary.hospital.name, tier: m.tier, min: m.line.priceMin, max: m.line.priceMax }))}
          />
        </div>
      </section>
    </>
  );
}

/** The recommendation itself, stated plainly before any list: where to refer and why. */
function Answer({ match: m, query }: { match: TreatmentMatch; query: string }) {
  const level = fairPriceLevel(m.savingVsMedian);
  return (
    <section aria-label="Rekomendasi" className="border-b px-4 py-6 sm:px-8">
      <p className="text-sm text-muted-foreground">Rujuk ke</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href={`/rumah-sakit/${m.summary.hospital.id}`} className="text-2xl font-semibold tracking-tight hover:underline">
          {m.summary.hospital.name}
        </Link>
        <TierBadge tier={m.tier} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {joinFacts(m.summary.hospital.city, LOCALITY_LABEL[m.locality])} · {m.line.rawName} (hal. {m.line.page})
      </p>
      <dl className="mt-4 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Tarif {query}</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatRange(m.line.priceMin, m.line.priceMax)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Dibanding harga wajar</dt>
          <dd className="mt-1 flex items-center gap-2">
            <RatingPill level={level} />
            <span className="text-xs text-muted-foreground">{medianDelta(m.savingVsMedian)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Layanan rumah sakit</dt>
          <dd className="mt-1 flex items-center gap-2">
            <RatingPill level={m.summary.services.level} />
            <span className="truncate text-xs text-muted-foreground">{m.summary.services.reason}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Four quick facts about every hospital that has it, before any filter. */
function Summary({ ranked, median, tierA }: { ranked: TreatmentMatch[]; median: number; tierA: number }) {
  const cheapest = ranked.reduce((best, m) => (m.priceMid < best.priceMid ? m : best));
  const local = ranked.filter((m) => m.locality === "kota");

  return (
    <dl className="grid grid-cols-2 gap-6 border-b px-4 py-7 sm:px-8 lg:grid-cols-4">
      <Fact label="Rumah sakit punya tarifnya" value={`${ranked.length} RS`}>
        {tierA} Tier A
      </Fact>
      <Fact label="Harga wajar" value={formatJuta(median)}>
        Median tarif semua RS
      </Fact>
      <Fact label="Tarif termurah" value={formatRange(cheapest.line.priceMin, cheapest.line.priceMax)}>
        <HospitalLink match={cheapest} />
      </Fact>
      <Fact label="Di kota ini" value={`${local.length} RS`}>
        {local[0] ? <HospitalLink match={local[0]} /> : "Rujuk ke kota lain"}
      </Fact>
    </dl>
  );
}

function Fact({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-sm text-foreground/80">{label}</dt>
      <dd className="mt-2 text-2xl font-medium tracking-tight whitespace-nowrap tabular-nums sm:text-3xl">{value}</dd>
      <dd className="mt-1 truncate text-xs text-muted-foreground">{children}</dd>
    </div>
  );
}

function HospitalLink({ match: m }: { match: TreatmentMatch }) {
  return (
    <Link href={`/rumah-sakit/${m.summary.hospital.id}`} className="hover:text-foreground hover:underline">
      {m.summary.hospital.name} · Tier {m.tier}
    </Link>
  );
}

function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-balance">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
