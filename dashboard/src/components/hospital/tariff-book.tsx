import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UrlSearchInput } from "@/components/url-search-input";
import { CATEGORIES, type CategoryId, categoryLabel } from "@/lib/categories";
import { FLAG_LABEL } from "@/lib/data/rows";
import type { TariffBook, TariffLine } from "@/lib/data/types";
import { formatRange, formatRupiah } from "@/lib/format";
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
    <div className={cn("flex flex-col gap-3", className)}>
      <nav aria-label="Jenis layanan" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
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
      <div className="-mx-4">
        <Table>
          <TableHeader className="[&_th]:text-xs [&_th]:text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead className="hidden pl-4 sm:table-cell">Hal.</TableHead>
              <TableHead className="pl-4 sm:pl-2">Nama di dokumen</TableHead>
              <TableHead className="hidden md:table-cell">Jenis</TableHead>
              <TableHead className="pr-4 text-right">Tarif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="hidden pl-4 align-top text-muted-foreground tabular-nums sm:table-cell">{line.page}</TableCell>
                <TableCell className="pl-4 whitespace-normal sm:pl-2">
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
                <TableCell className="pr-4 text-right align-top font-medium whitespace-nowrap tabular-nums">{formatLinePrice(line)}</TableCell>
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
          <div className="flex items-center justify-between gap-3 px-4 pt-3 text-xs text-muted-foreground">
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
      </div>
    </div>
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
