"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [25, 50, 100];

const pageButton =
  "grid size-8 cursor-pointer place-items-center rounded-md border border-border transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

const num = (n: number) => n.toLocaleString("id-ID");

/** The strip under a table: which rows show, rows per page, and paging. `page` counts from 0. */
export function TablePager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);
  const sizes = PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }));

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t px-3 py-2 text-sm text-muted-foreground sm:px-4">
      <span className="whitespace-nowrap tabular-nums">
        {num(first)}–{num(last)} dari {num(total)}
      </span>

      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap">Baris</span>
        <Select items={sizes} value={String(pageSize)} onValueChange={(value) => value && onPageSize(Number(value))}>
          <SelectTrigger aria-label="Baris per halaman" className="h-8 w-18 cursor-pointer px-2 text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap tabular-nums">
          Halaman {num(page + 1)} dari {num(pageCount)}
        </span>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page === 0} title="Sebelumnya" aria-label="Halaman sebelumnya" className={pageButton}>
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page + 1 >= pageCount}
          title="Berikutnya"
          aria-label="Halaman berikutnya"
          className={pageButton}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
