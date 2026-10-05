import { ArrowRight, Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { RatingPill } from "@/components/rating";
import { TipeBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { UrlSearchInput } from "@/components/url-search-input";
import { UrlSelect } from "@/components/url-select";
import { CARE_CATEGORIES, categoryLabel } from "@/lib/categories";
import { getBookRowStats, getDataset, searchLines } from "@/lib/data/queries";
import type { Dataset, Hospital } from "@/lib/data/types";
import { formatDate, formatJuta, formatPercent, formatRange, joinFacts } from "@/lib/format";
import { allSummaries, fairPriceLevel, type HospitalSummary, originsOf, rankForTreatment, summarize, type TreatmentMatch } from "@/lib/scoring";
import { type Completeness, dataCompleteness } from "@/lib/tariff-book";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bandingkan Rumah Sakit",
  description: "Bandingkan tarif, layanan, dan fasilitas rumah sakit",
};

const MAX_COMPARE = 3;

const STICKY_HEAD = "sticky top-0 z-20 bg-card shadow-[inset_0_-1px_0_var(--border)]";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Commas are kept literal so the link reads like the documented `?rs=a,b,c` contract.
const compareHref = (ids: string[], query?: string) => {
  const parts = [ids.length > 0 && `rs=${ids.join(",")}`, query && `q=${encodeURIComponent(query)}`].filter(Boolean).join("&");
  return parts ? `/bandingkan?${parts}` : "/bandingkan";
};

/** Marks the best value in a row. Ties all win; a row where everyone is equal highlights nobody. */
const bestOf = (values: (number | null)[], prefer: "high" | "low") => {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return values.map(() => false);
  const target = prefer === "high" ? Math.max(...valid) : Math.min(...valid);
  if (valid.every((v) => v === target)) return values.map(() => false);
  return values.map((v) => v === target);
};

type Column = {
  hospital: Hospital;
  summary: HospitalSummary;
  /** Its row for the searched treatment; null without a search or when its document has none. */
  match: TreatmentMatch | null;
  completeness: Completeness;
};

export default async function ComparePage({ searchParams }: PageProps<"/bandingkan">) {
  const params = await searchParams;
  const data = await getDataset();
  const query = (first(params.q) ?? "").trim();
  const requested = [...new Set((first(params.rs) ?? "").split(",").map((id) => id.trim()))];
  const hospitals = requested
    .map((id) => data.hospitals.find((h) => h.id === id))
    .filter((h): h is Hospital => Boolean(h))
    .slice(0, MAX_COMPARE);
  const ids = hospitals.map((h) => h.id);

  // Matched against every hospital, so the median is the market's, not just these three's.
  const origin = originsOf(hospitals)[0] ?? { city: "", province: "" };
  const bookIds = data.hospitals.flatMap((h) => (h.tariffBook ? [h.tariffBook.id] : []));
  const matches = query ? rankForTreatment(await searchLines(query, bookIds), origin, data) : [];

  const ranked = allSummaries(data).sort((a, b) => (a.placing?.rank ?? Infinity) - (b.placing?.rank ?? Infinity));
  const columns: Column[] = await Promise.all(
    hospitals.map(async (hospital) => {
      const rowStats = hospital.tariffBook ? await getBookRowStats(hospital.tariffBook.id) : null;
      return {
        hospital,
        summary: summarize(hospital, data),
        match: matches.find((m) => m.summary.hospital.id === hospital.id) ?? null,
        completeness: dataCompleteness(hospital, rowStats),
      };
    }),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader title="Bandingkan Rumah Sakit" />

      <div className="mb-6 grid gap-3">
        <div className="sm:max-w-md">
          <Suspense>
            <UrlSearchInput param="q" label="Tindakan (opsional)" value={query} placeholder="mis. kraniotomi, CT scan kepala" />
          </Suspense>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {hospitals.map((h) => (
            <span key={h.id} className="inline-flex h-6 max-w-full items-center gap-0.5 rounded-full bg-muted pr-0.5 pl-2.5 font-medium">
              <span className="truncate">{h.name}</span>
              <Link
                href={compareHref(
                  ids.filter((id) => id !== h.id),
                  query,
                )}
                scroll={false}
                aria-label={`Hapus ${h.name} dari perbandingan`}
                className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="size-3" />
              </Link>
            </span>
          ))}
        </div>
      </div>

      {columns.length < 2 ? (
        <PickHospitals ranked={ranked} ids={ids} query={query} />
      ) : (
        <>
          {query && <Summary columns={columns} query={query} />}
          <CompareTable columns={columns} ranked={ranked} ids={ids} query={query} data={data} />
        </>
      )}
    </div>
  );
}

function PickHospitals({ ranked, ids, query }: { ranked: HospitalSummary[]; ids: string[]; query: string }) {
  const suggestion = ranked.filter((s) => s.tipe !== null).slice(0, MAX_COMPARE);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilih 2–3 rumah sakit</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {ranked.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data</p>}
        {ids.length === 0 && suggestion.length >= 2 && (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-3 sm:flex-row sm:items-center">
            <Link
              href={compareHref(
                suggestion.map((s) => s.hospital.id),
                query,
              )}
              className={cn(buttonVariants(), "self-start sm:self-auto")}
            >
              Bandingkan 3 teratas
              <ArrowRight />
            </Link>
            <p className="text-sm text-muted-foreground text-pretty">{suggestion.map((s) => s.hospital.name).join(" · ")}</p>
          </div>
        )}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((s) => {
            const selected = ids.includes(s.hospital.id);
            const next = selected ? ids.filter((id) => id !== s.hospital.id) : [...ids, s.hospital.id];
            return (
              <li key={s.hospital.id}>
                <Link
                  href={compareHref(next, query)}
                  scroll={false}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/60",
                    selected && "border-foreground/40 bg-muted/60",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                      selected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.hospital.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.hospital.city}</span>
                  </span>
                  {s.tipe ? <TipeBadge tipe={s.tipe} /> : <span className="text-xs text-muted-foreground">Tanpa tarif</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Summary({ columns, query }: { columns: Column[]; query: string }) {
  const matched = columns.map((c) => c.match).filter((m): m is TreatmentMatch => m !== null);
  const missing = columns.filter((c) => !c.match).map((c) => c.hospital.name);

  if (matched.length === 0) {
    return <p className="mb-4 rounded-xl border px-4 py-3 text-sm text-muted-foreground">Tidak ada tarif untuk &ldquo;{query}&rdquo;</p>;
  }

  const cheapest = matched.reduce((min, m) => (m.priceMid < min.priceMid ? m : min));
  const priciest = matched.reduce((max, m) => (m.priceMid > max.priceMid ? m : max));
  const saving = (priciest.priceMid - cheapest.priceMid) / priciest.priceMid;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-pretty">
        <span className="font-semibold">{cheapest.summary.hospital.name}</span> paling murah untuk &ldquo;{query}&rdquo;
        {cheapest !== priciest && saving >= 0.005 && (
          <>
            , <span className="font-medium text-tier-a-ink">±{formatPercent(saving)} lebih murah</span> dari {priciest.summary.hospital.name}
          </>
        )}
        .{missing.length > 0 && <span className="text-muted-foreground"> {missing.join(" dan ")} tidak punya tarifnya.</span>}
      </p>
      <Link href={`/rekomendasi?q=${encodeURIComponent(query)}`} className="group inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground">
        Semua rumah sakit <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function CompareTable({ columns, ranked, ids, query, data }: { columns: Column[]; ranked: HospitalSummary[]; ids: string[]; query: string; data: Dataset }) {
  const hasSlot = columns.length < MAX_COMPARE;
  const median = columns.find((c) => c.match)?.match?.medianPrice ?? null;

  return (
    <div className="rounded-xl border bg-card">
      {/* Below lg the table scrolls inside its own box (so both sticky edges work there);
          from lg it fits, and the header row sticks to the top of the window instead. */}
      <div className="max-h-[80svh] overflow-auto overscroll-x-contain rounded-xl lg:max-h-none lg:overflow-visible">
        {/* Separate borders so the corner cells can round off with the card; row lines are drawn per cell. */}
        <table
          className={cn(
            "w-full min-w-[46rem] table-fixed border-separate border-spacing-0 text-sm",
            "[&_tbody_tr:not([data-section])>*]:border-b [&_tbody_tr:last-child>*]:border-b-0",
            "[&_tbody_tr:last-child>*:first-child]:rounded-bl-xl [&_tbody_tr:last-child>*:last-child]:rounded-br-xl",
          )}
        >
          <colgroup>
            <col className="w-40 sm:w-56" />
            {Array.from({ length: MAX_COMPARE }, (_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <TableHead className={cn(STICKY_HEAD, "left-0 z-25 rounded-tl-xl pl-4")}>
                <span className="sr-only">Kriteria</span>
              </TableHead>
              {columns.map((c) => (
                <HospitalHeader key={c.hospital.id} column={c} ids={ids} query={query} />
              ))}
              {hasSlot && (
                <TableHead className={cn(STICKY_HEAD, "h-auto rounded-tr-xl py-3 align-top font-normal whitespace-normal")}>
                  <div className="rounded-lg border border-dashed p-2.5">
                    <Suspense>
                      <UrlSelect
                        param="rs"
                        label="Tambah rumah sakit"
                        value=""
                        options={[
                          { value: "", label: "Pilih rumah sakit…" },
                          ...ranked
                            .filter((s) => !ids.includes(s.hospital.id))
                            .map((s) => ({
                              value: [...ids, s.hospital.id].join(","),
                              label: joinFacts(s.hospital.name, s.hospital.city),
                            })),
                        ]}
                      />
                    </Suspense>
                  </div>
                </TableHead>
              )}
            </tr>
          </thead>
          <TableBody>
            {query ? (
              <>
                <Section title={`Tarif "${query}"`} />
                <CompareRow
                  label="Tarif"
                  hint={median === null ? undefined : `Median ${formatJuta(median)}`}
                  columns={columns}
                  best={bestOf(
                    columns.map((c) => c.match?.priceMid ?? null),
                    "low",
                  )}
                  render={(c) =>
                    c.match ? (
                      <span className="grid justify-items-start gap-1.5">
                        <span className="font-medium tabular-nums">{formatRange(c.match.line.priceMin, c.match.line.priceMax)}</span>
                        <RatingPill level={fairPriceLevel(c.match.savingVsMedian)} />
                      </span>
                    ) : (
                      <Muted>Tidak ada tarif</Muted>
                    )
                  }
                />
                <CompareRow
                  label="Baris di dokumen"
                  columns={columns}
                  render={(c) =>
                    c.match ? (
                      <span>
                        {c.match.line.rawName}
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          hal. {c.match.line.page}
                          {c.match.otherRows > 0 && ` · ${c.match.otherRows} baris lain cocok`}
                        </span>
                      </span>
                    ) : (
                      <Muted>—</Muted>
                    )
                  }
                />
              </>
            ) : (
              <>
                <Section title="Layanan" />
                {CARE_CATEGORIES.map((category) => {
                  const counts = columns.map((c) => c.hospital.tariffBook?.categories[category] ?? 0);
                  return (
                    <CompareRow
                      key={category}
                      label={categoryLabel(category)}
                      columns={columns}
                      best={bestOf(counts, "high")}
                      render={(_, i) =>
                        counts[i] > 0 ? <span className="tabular-nums">{counts[i].toLocaleString("id-ID")} baris tarif</span> : <Muted>Tidak ada</Muted>
                      }
                    />
                  );
                })}
              </>
            )}

            <Section title="Penilaian" />
            <CompareRow
              label="Peringkat"
              columns={columns}
              best={bestOf(
                columns.map((c) => (c.summary.placing ? -c.summary.placing.rank : null)),
                "high",
              )}
              render={(c) =>
                c.summary.placing ? (
                  <span className="tabular-nums">
                    <span className="text-lg font-semibold">{c.summary.placing.rank}</span>
                    <span className="text-muted-foreground"> dari {c.summary.placing.of}</span>
                  </span>
                ) : (
                  <Muted>—</Muted>
                )
              }
            />
            <CompareRow
              label="Harga"
              hint="Dibanding RS lain, pada layanan yang sama"
              columns={columns}
              render={(c) => (
                <span>
                  <RatingPill level={c.summary.price?.level ?? null} />
                  {c.summary.price && <span className="block text-xs text-muted-foreground">{c.summary.price.reason}</span>}
                </span>
              )}
            />
            <CompareRow
              label="Layanan"
              columns={columns}
              render={(c) => (
                <span>
                  <RatingPill level={c.summary.services.level} />
                  <span className="block text-xs text-muted-foreground">{c.summary.services.reason}</span>
                </span>
              )}
            />

            <Section title="Profil" />
            <CompareRow label="Kepemilikan" columns={columns} render={(c) => c.hospital.ownership ?? "—"} />
            <CompareRow label="Kota" columns={columns} render={(c) => joinFacts(c.hospital.city, c.hospital.province) || "—"} />
            <CompareRow
              label="Mitra PKS"
              columns={columns}
              render={(c) => <Presence present={c.hospital.partner} detail={c.hospital.partner ? "Mitra PKS" : "Belum mitra"} />}
            />

            <Section title="Fasilitas" />
            {data.catalog.facilities.map((f) => (
              <CompareRow
                key={f.id}
                label={f.name}
                columns={columns}
                render={(c) => {
                  const present = c.hospital.facilities.some((x) => x.facilityId === f.id);
                  return <Presence present={present} detail={present ? "Ada" : "Tidak ada"} />;
                }}
              />
            ))}

            <Section title="Tenaga medis" />
            {data.catalog.specialties.map((s) => (
              <CompareRow
                key={s.id}
                label={s.name}
                columns={columns}
                render={(c) => {
                  const present = c.hospital.staff.some((x) => x.specialtyId === s.id);
                  return <Presence present={present} detail={present ? "Ada" : "Tidak ada"} />;
                }}
              />
            ))}

            <Section title="Data" />
            <CompareRow
              label="Data tarif"
              columns={columns}
              render={(c) =>
                c.hospital.tariffBook ? (
                  <span>
                    Versi {c.hospital.tariffBook.version}
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(c.hospital.tariffBook.validFrom)} – {formatDate(c.hospital.tariffBook.validTo)}
                    </span>
                  </span>
                ) : (
                  <Muted>Belum ada data tarif</Muted>
                )
              }
            />
            {columns[0].completeness.map((item, index) => (
              <CompareRow
                key={item.label}
                label={item.label}
                columns={columns}
                render={(c) => {
                  const own = c.completeness[index];
                  return <Presence present={own.complete} detail={own.detail} />;
                }}
              />
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

function HospitalHeader({ column: c, ids, query }: { column: Column; ids: string[]; query: string }) {
  return (
    <TableHead className={cn(STICKY_HEAD, "h-auto py-3 align-top whitespace-normal last:rounded-tr-xl")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/rumah-sakit/${c.hospital.id}`} className="font-semibold hover:underline">
            {c.hospital.name}
          </Link>
          <p className="text-xs font-normal text-muted-foreground">{c.hospital.city}</p>
        </div>
        <Link
          href={compareHref(
            ids.filter((id) => id !== c.hospital.id),
            query,
          )}
          scroll={false}
          aria-label={`Hapus ${c.hospital.name} dari perbandingan`}
          className="-mt-1 -mr-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </Link>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {c.summary.tipe ? <TipeBadge tipe={c.summary.tipe} /> : <span className="text-xs font-normal text-muted-foreground">Tanpa tarif</span>}
        {c.summary.placing && (
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            Peringkat <span className="text-sm font-semibold text-foreground">{c.summary.placing.rank}</span> dari {c.summary.placing.of}
          </span>
        )}
      </div>
    </TableHead>
  );
}

function Section({ title }: { title: string }) {
  return (
    <TableRow data-section className="bg-muted/50 hover:bg-muted/50">
      <TableCell colSpan={MAX_COMPARE + 1} className="p-0">
        {/* Sticky so the section title stays in view while the table scrolls sideways. */}
        <div className="sticky left-0 inline-flex items-baseline gap-2 px-4 pt-3 pb-1.5">
          <span className="text-xs font-semibold tracking-wide uppercase">{title}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CompareRow({
  label,
  hint,
  columns,
  best,
  render,
}: {
  label: string;
  hint?: React.ReactNode;
  columns: Column[];
  best?: boolean[];
  render: (column: Column, index: number) => React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableHead
        scope="row"
        className="sticky left-0 z-10 h-auto bg-card py-2.5 pl-4 align-top font-normal whitespace-normal shadow-[inset_-1px_0_0_var(--border)]"
      >
        <span className="text-sm">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </TableHead>
      {columns.map((c, index) => (
        <TableCell key={c.hospital.id} className={cn("py-2.5 align-top whitespace-normal", best?.[index] && "bg-tier-a-soft/70")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">{render(c, index)}</div>
            {best?.[index] && (
              <span className="shrink-0 text-tier-a-ink">
                <Check className="size-4" />
                <span className="sr-only">Terbaik</span>
              </span>
            )}
          </div>
        </TableCell>
      ))}
      {columns.length < MAX_COMPARE && <TableCell />}
    </TableRow>
  );
}

function Presence({ present, detail, critical = false }: { present: boolean; detail?: string; critical?: boolean }) {
  return (
    <span className="flex items-start gap-2">
      {present ? (
        <Check className="mt-0.5 size-4 shrink-0 text-tier-a-ink" />
      ) : (
        <X className={cn("mt-0.5 size-4 shrink-0", critical ? "text-tier-c-ink" : "text-muted-foreground/60")} />
      )}
      <span className={cn("text-sm", !present && (critical ? "font-medium text-tier-c-ink" : "text-muted-foreground"))}>
        {detail}
      </span>
    </span>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
