"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TreatmentPicker } from "@/components/search/treatment-picker";
import type { Treatment } from "@/lib/data/types";

/**
 * The compare page's tindakan: a dropdown of the ones most hospitals price, searchable for the rest.
 * The pick lives in the URL's `q` as the tindakan's name, so the table matches it by text.
 */
export function UrlTreatmentField({ value, suggestions }: { value: Treatment | null; suggestions: Treatment[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (next: Treatment | null) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("q", next.name);
    else params.delete("q");
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  return (
    <div className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden>Tindakan</span>
      <TreatmentPicker value={value} onValueChange={onChange} suggestions={suggestions} compact />
    </div>
  );
}
