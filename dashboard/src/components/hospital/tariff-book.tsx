import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UrlSearchInput } from "@/components/url-search-input";
import { CATEGORIES, type CategoryId, categoryLabel } from "@/lib/categories";
import { FLAG_LABEL } from "@/lib/data/rows";
import type { TariffBook, TariffLine } from "@/lib/data/types";
import { formatDate, formatRange, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

const formatLinePrice = (line: TariffLine) => {
  if (line.priceMin === null || line.priceMax === null) return "—";
  return line.priceMin === line.priceMax ? formatRupiah(line.priceMin) : formatRange(line.priceMin, line.priceMax);
};

export const TARIFF_PAGE_SIZE = 50;

/** A link to this page of the table with some params changed; the rest are kept. */
const hrefWith = (params: { kategori?: CategoryId; cari?: string; hal?: number }) => {
  const search = new URLSearchParams();
  if (params.kategori) search.set("kategori", params.kategori);
  if (params.cari) search.set("cari", params.cari);
  if (params.hal && params.hal > 1) search.set("hal", String(params.hal));
  const query = search.toString();
  return query ? `?${query}` : "?";
};

/** Every row of the document, a category and a page at a time, searchable by name. */
export function TariffLinesTable({
  book,
  lines,
  total,
  category,
  query,
  page,
  className,
}: {
  book: TariffBook;
  /** This page's rows. */
  lines: TariffLine[];
  /** Rows matching the category and search. */
  total: number;
  category: CategoryId | undefined;
  query: string;
  page: number;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / TARIFF_PAGE_SIZE));
  const tabs = [{ id: undefined, label: "Semua", count: book.rows }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: book.categories[c.id] ?? 0 }))].filter(
    (t) => t.count > 0,
  );

  return (
    <Card className={cn("gap-4 pb-2", className)}>
      <CardHeader className="gap-3">
        <CardTitle>Baris tarif</CardTitle>
        <nav aria-label="Jenis layanan" className="-mx-(--card-spacing) overflow-x-auto px-(--card-spacing) [scrollbar-width:none]">
          <ul className="flex gap-1 text-xs">
            {tabs.map((t) => (
              <li key={t.id ?? "semua"}>
                <Link
                  href={hrefWith({ kategori: t.id, cari: query })}
                  scroll={false}
                  aria-current={t.id === category ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium whitespace-nowrap transition-colors",
                    t.id === category ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span className="tabular-nums opacity-70">{t.count.toLocaleString("id-ID")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Suspense>
          <UrlSearchInput param="cari" label="Cari baris" value={query} placeholder="Cari nama tindakan atau layanan" className="max-w-sm" />
        </Suspense>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader className="[&_th]:text-xs [&_th]:text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead className="hidden pl-(--card-spacing) sm:table-cell">Hal.</TableHead>
              <TableHead className="pl-(--card-spacing) sm:pl-2">Nama di dokumen</TableHead>
              <TableHead className="hidden md:table-cell">Jenis</TableHead>
              <TableHead className="pr-(--card-spacing) text-right">Tarif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="hidden pl-(--card-spacing) align-top text-muted-foreground tabular-nums sm:table-cell">{line.page}</TableCell>
                <TableCell className="pl-(--card-spacing) whitespace-normal sm:pl-2">
                  {line.rawName}
                  {(line.parents.length > 0 || line.section) && (
                    <span className="block text-xs text-muted-foreground">{line.parents.join(" › ") || line.section}</span>
                  )}
                  <span className="block text-xs text-muted-foreground sm:hidden">hal. {line.page}</span>
                  {line.flags.length > 0 && (
                    <span className="mt-0.5 block text-xs font-medium text-tier-b-ink">{line.flags.map((f) => FLAG_LABEL[f] ?? f).join(" · ")}</span>
                  )}
                </TableCell>
                <TableCell className="hidden align-top text-xs text-muted-foreground md:table-cell">{categoryLabel(line.category)}</TableCell>
                <TableCell className="pr-(--card-spacing) text-right align-top font-medium whitespace-nowrap tabular-nums">{formatLinePrice(line)}</TableCell>
              </TableRow>
            ))}
            {lines.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Tidak ada baris yang cocok
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 px-(--card-spacing) pt-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {((page - 1) * TARIFF_PAGE_SIZE + 1).toLocaleString("id-ID")}–{Math.min(page * TARIFF_PAGE_SIZE, total).toLocaleString("id-ID")} dari{" "}
              {total.toLocaleString("id-ID")}
            </span>
            <span className="flex gap-1">
              <PageLink href={hrefWith({ kategori: category, cari: query, hal: page - 1 })} disabled={page <= 1} label="Sebelumnya">
                <ChevronLeft className="size-4" />
              </PageLink>
              <PageLink href={hrefWith({ kategori: category, cari: query, hal: page + 1 })} disabled={page >= pages} label="Berikutnya">
                <ChevronRight className="size-4" />
              </PageLink>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span className="flex size-8 items-center justify-center rounded-md opacity-40">{children}</span>;
  return (
    <Link href={href} scroll={false} aria-label={label} className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground">
      {children}
    </Link>
  );
}

/** The source document, its validity, and the one before it. */
export function TariffBookSource({
  book,
  previous,
  expired,
}: {
  book: TariffBook;
  previous: TariffBook | null;
  expired: boolean;
}) {
  const versions = [
    { version: book.version, validFrom: book.validFrom, validTo: book.validTo, rows: book.rows, current: true },
    ...(previous ? [{ version: previous.version, validFrom: previous.validFrom, validTo: previous.validTo, rows: previous.rows, current: false }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sumber</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <p className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 font-medium break-all">{book.source}</span>
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
          <dt className="text-muted-foreground">Versi</dt>
          <dd className="font-medium">{book.version}</dd>
          <dt className="text-muted-foreground">Berlaku</dt>
          <dd className="font-medium">
            {formatDate(book.validFrom)} – {formatDate(book.validTo)}
          </dd>
          <dt className="self-center text-muted-foreground">Status</dt>
          <dd>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 font-medium",
                expired ? "bg-tier-c-soft text-tier-c-ink" : "bg-tier-a-soft text-tier-a-ink",
              )}
            >
              {expired ? "Kedaluwarsa" : "Berlaku"}
            </span>
          </dd>
        </dl>

        <div>
          <p className="mb-2.5 text-[11px] font-medium text-muted-foreground uppercase">Riwayat versi</p>
          <ol className="grid gap-3 border-l pl-4">
            {versions.map((v) => (
              <li key={v.version} className="relative">
                <span
                  className={cn(
                    "absolute top-1.5 -left-[calc(1rem+4.5px)] size-2 rounded-full ring-2 ring-card",
                    v.current ? "bg-foreground" : "bg-muted-foreground/40",
                  )}
                />
                <p className="flex items-center gap-2">
                  <span className="font-medium">{v.version}</span>
                  {v.current && <Badge variant="secondary">Aktif</Badge>}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(v.validFrom)} – {formatDate(v.validTo)} · {v.rows.toLocaleString("id-ID")} baris
                </p>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
