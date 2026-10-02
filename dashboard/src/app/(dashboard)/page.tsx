import { AlertTriangle, ArrowRight, FileWarning } from "lucide-react";
import Link from "next/link";

import { ChartEmpty } from "@/components/charts/chart-kit";
import { CoverageMatrix, type CoverageRow } from "@/components/overview/coverage-matrix";
import { MethodNote, RatingLine, RatingPill } from "@/components/rating";
import { TierBadge, TierDot } from "@/components/tier-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CARE_CATEGORIES, type CategoryId, categoryLabel } from "@/lib/categories";
import { getDataset } from "@/lib/data/queries";
import type { Tier } from "@/lib/data/types";
import { formatDate, joinFacts, kelasLabel } from "@/lib/format";
import { allSummaries, type HospitalSummary } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const TIER_RANK: Record<Tier, number> = { A: 0, B: 1, C: 2 };

const offers = (s: HospitalSummary, category: CategoryId) => (s.hospital.tariffBook?.categories[category] ?? 0) > 0;

const byTierThenComposite = (a: HospitalSummary, b: HospitalSummary) => TIER_RANK[a.tier ?? "C"] - TIER_RANK[b.tier ?? "C"] || b.composite - a.composite;

export default async function OverviewPage() {
  const data = await getDataset();
  const all = allSummaries(data);
  // Only hospitals with a published document have a tier to show.
  const summaries = all.filter((s) => s.tier !== null).sort((a, b) => (a.placing?.rank ?? 0) - (b.placing?.rank ?? 0));

  const tierCounts: Record<Tier, number> = { A: 0, B: 0, C: 0 };
  for (const s of summaries) if (s.tier) tierCounts[s.tier] += 1;

  const expired = all.filter((s) => s.dataExpired);
  const unplaced = summaries.filter((s) => !s.hospital.city);
  const partners = all.filter((s) => s.hospital.partner).length;
  const provinces = new Set(summaries.map((s) => s.hospital.province).filter(Boolean)).size;

  // Hospitals whose document doesn't print a city have no row of their own.
  const cityNames = [...new Set(summaries.map((s) => s.hospital.city).filter(Boolean))].sort();
  // Summaries are in rank order, so each city's first is its go-to hospital.
  const topByCity = cityNames.flatMap((city) => summaries.find((s) => s.hospital.city === city) ?? []);
  const coverage: CoverageRow[] = cityNames.map((city) => {
    const here = summaries.filter((s) => s.hospital.city === city);
    return {
      city,
      hospitals: here.length,
      cells: CARE_CATEGORIES.map((c) => {
        const best = here.filter((s) => offers(s, c)).sort(byTierThenComposite)[0];
        return { columnId: c, tier: best?.tier ?? null, hospital: best?.hospital.name };
      }),
    };
  });

  return (
    <div className="grid gap-5 p-4 sm:p-6">
      <section aria-label="Angka utama" className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kpi label="Rumah sakit terdata" value={all.length} unit="RS">
          {partners} mitra PKS
        </Kpi>
        <TierMixCard counts={tierCounts} />
        <Kpi label="Kota tercakup" value={cityNames.length} unit="kota">
          {provinces} provinsi
        </Kpi>
        <Kpi label="Data kedaluwarsa" value={expired.length} unit="RS" tone={expired.length ? "warn" : undefined}>
          {expired.length ? "Perlu dokumen baru" : "Semua berlaku"}
        </Kpi>
      </section>

      {topByCity.length > 0 && (
        <ChartCard title="Rujukan Utama per Kota" description="Rumah sakit peringkat teratas di tiap kota">
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topByCity.map((s) => (
              <li key={s.hospital.id} className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">{s.hospital.city}</p>
                <div className="mt-1 flex items-start justify-between gap-2">
                  <Link href={`/rumah-sakit/${s.hospital.id}`} className="min-w-0 font-medium hover:underline">
                    {s.hospital.name}
                  </Link>
                  {s.tier && <TierBadge tier={s.tier} />}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <RatingLine label="Harga" rating={s.price} />
                  <RatingLine label="Layanan" rating={s.services} />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Peringkat Rumah Sakit" description="Dibandingkan antar rumah sakit terdata" flush>
            {summaries.length === 0 ? (
              <ChartEmpty shape="rows" className="mx-6 mb-6" title="Belum ada data" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 pl-6">#</TableHead>
                      <TableHead>Rumah sakit</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead className="pr-6">Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s) => (
                      <TableRow key={s.hospital.id}>
                        <TableCell className="pl-6 font-semibold tabular-nums">{s.placing?.rank}</TableCell>
                        <TableCell className="whitespace-normal">
                          <Link href={`/rumah-sakit/${s.hospital.id}`} className="font-medium hover:underline">
                            {s.hospital.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{joinFacts(s.hospital.city, kelasLabel(s.hospital.kelas)) || "—"}</p>
                        </TableCell>
                        <TableCell title={s.price?.reason}>
                          <RatingPill level={s.price?.level ?? null} />
                        </TableCell>
                        <TableCell title={s.services.reason}>
                          <RatingPill level={s.services.level} />
                        </TableCell>
                        <TableCell className="pr-6">{s.tier && <TierBadge tier={s.tier} />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <MethodNote className="px-6 py-4" />
              </>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Perlu Perhatian" description="Data kedaluwarsa atau kota tidak tercetak">
          <div className="grid gap-1">
            {expired.map((s) => (
              <Alert key={s.hospital.id} icon={<FileWarning className="size-4 text-tier-b-ink" />} title={s.hospital.name} href={`/rumah-sakit/${s.hospital.id}`}>
                Data tarif berakhir {formatDate(s.hospital.tariffBook?.validTo ?? null)}
              </Alert>
            ))}
            {unplaced.map((s) => (
              <Alert key={s.hospital.id} icon={<AlertTriangle className="size-4 text-tier-c-ink" />} title={s.hospital.name} href={`/rumah-sakit/${s.hospital.id}`}>
                Kota tidak tercetak di dokumen
              </Alert>
            ))}
            {expired.length === 0 && unplaced.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada catatan</p>}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Cakupan Layanan per Wilayah" description="Tier terbaik yang tersedia per kota dan jenis layanan">
        <CoverageMatrix columns={CARE_CATEGORIES.map((c) => ({ id: c, name: categoryLabel(c) }))} rows={coverage} />
      </ChartCard>
    </div>
  );
}

/** How the tiered hospitals split across A, B and C, as one bar. */
function TierMixCard({ counts }: { counts: Record<Tier, number> }) {
  const total = counts.A + counts.B + counts.C;
  return (
    <div className={cn(CARD, "px-5 py-4")}>
      <h2 className="truncate text-sm font-medium">Komposisi tier</h2>
      <div className="mt-3 flex h-2 gap-0.5" aria-hidden>
        {total === 0 && <span className="h-full flex-1 rounded-full bg-muted" />}
        {(["A", "B", "C"] as const)
          .filter((t) => counts[t] > 0)
          .map((t) => (
            <span key={t} className={cn("h-full rounded-[2px] first:rounded-l-full last:rounded-r-full", TIER_BAR[t])} style={{ flexGrow: counts[t] }} />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {(["A", "B", "C"] as const).map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <TierDot tier={t} />
            {t}
            <span className="font-semibold tabular-nums">{counts[t]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TIER_BAR: Record<Tier, string> = { A: "bg-tier-a", B: "bg-tier-b", C: "bg-tier-c" };

const CARD = "min-w-0 rounded-xl bg-card ring-1 ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)]";

/** A headline number in its own card: label, value, then one line of context. */
function Kpi({
  label,
  value,
  unit,
  tier,
  tone,
  children,
}: {
  label: string;
  value: number | string;
  unit?: string;
  tier?: Tier;
  tone?: "warn";
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(CARD, "px-5 py-4")}>
      <h2 className="flex items-center gap-2 truncate text-sm font-medium">
        {tier && <TierDot tier={tier} />}
        {label}
      </h2>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </p>
      {children && (
        <p className={cn("mt-1 truncate text-xs tabular-nums", tier ? TIER_INK[tier] : tone === "warn" ? "text-tier-c-ink" : "text-muted-foreground")}>
          {children}
        </p>
      )}
    </div>
  );
}

const TIER_INK: Record<Tier, string> = { A: "text-tier-a-ink", B: "text-tier-b-ink", C: "text-tier-c-ink" };

/** A card with its title and one line of description inside; `flush` lets a table run edge to edge below them. */
function ChartCard({
  title,
  description,
  flush,
  children,
}: {
  title: string;
  description: string;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(CARD, "flex flex-col overflow-hidden", !flush && "pb-6")}>
      <header className="px-6 pt-5 pb-4">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className={cn("min-w-0 flex-1", !flush && "px-6")}>{children}</div>
    </section>
  );
}

function Alert({ icon, title, href, children }: { icon: React.ReactNode; title: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group -mx-3 flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted">
      <span className="mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{children}</span>
      </span>
      <ArrowRight className="mt-0.5 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
