"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CategoryId } from "@/lib/categories";
import { LINE_SELECT, type LineRow, toLine } from "@/lib/data/rows";
import type { TariffLine } from "@/lib/data/types";
import { formatRange, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const PAGE = 50;

export const linePrice = (row: TariffLine) => {
  if (row.priceMin === null || row.priceMax === null) return "—";
  return row.priceMin === row.priceMax ? formatRupiah(row.priceMin) : formatRange(row.priceMin, row.priceMax);
};

/** One category of a document's rows, loaded a page at a time when opened. */
export function CategoryRows({ bookId, category, label, count }: { bookId: string; category: CategoryId; label: string; count: number }) {
  const [rows, setRows] = useState<TariffLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const from = rows?.length ?? 0;
    const { data, error } = await createClient()
      .from("tariff_rows")
      .select(LINE_SELECT)
      .eq("book_id", bookId)
      .eq("category", category)
      .order("position")
      .range(from, from + PAGE - 1)
      .returns<LineRow[]>();
    setLoading(false);
    if (error) return setError(error.message);
    setRows([...(rows ?? []), ...(data ?? []).map(toLine)]);
  };

  return (
    <details className="group" onToggle={(e) => e.currentTarget.open && rows === null && !loading && load()}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{count.toLocaleString("id-ID")} baris</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t bg-muted/20">
        {error && <p className="px-4 py-3 text-sm text-tier-c-ink">{error}</p>}
        {rows && (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="grid gap-0.5 px-4 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
                <span className="min-w-0">
                  {row.rawName}
                  <span className="block text-xs text-muted-foreground">
                    {[row.parents.join(" › ") || row.section, `hal. ${row.page}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="tabular-nums sm:text-right">{linePrice(row)}</span>
              </li>
            ))}
          </ul>
        )}
        {loading && (
          <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            Memuat…
          </p>
        )}
        {rows && rows.length < count && !loading && (
          <div className="px-4 py-2">
            <Button type="button" variant="ghost" size="sm" onClick={load}>
              Tampilkan {Math.min(PAGE, count - rows.length)} lagi
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}
