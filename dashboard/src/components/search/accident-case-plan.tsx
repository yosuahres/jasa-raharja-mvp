import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { AccidentCase } from "@/lib/accident-cases";
import type { PricedTreatment } from "@/lib/data/types";
import { formatRupiah } from "@/lib/format";

const priceText = (t: PricedTreatment) => {
  if (t.priceMin === null || t.priceMax === null) return null;
  return t.priceMin === t.priceMax ? formatRupiah(t.priceMin) : `${formatRupiah(t.priceMin)} – ${formatRupiah(t.priceMax)}`;
};

/**
 * The tindakan an accident case usually needs, step by step, each opening the hospitals that price it.
 * Only tindakan the current documents price are listed; a step with none is left out.
 */
export function AccidentCasePlan({
  accidentCase,
  treatments,
  location,
}: {
  accidentCase: AccidentCase;
  treatments: PricedTreatment[];
  location: string;
}) {
  const byKey = new Map(treatments.map((t) => [t.key, t]));
  const steps = accidentCase.steps
    .map((step) => ({ label: step.label, treatments: step.keys.flatMap((key) => byKey.get(key) ?? []) }))
    .filter((step) => step.treatments.length > 0);

  const href = (key: string) => {
    const params = new URLSearchParams({ tindakan: key, kasus: accidentCase.id });
    if (location) params.set("lokasi", location);
    return `/rekomendasi?${params}`;
  };

  if (steps.length === 0) {
    return <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm font-semibold">Belum ada tarif untuk kasus ini</p>;
  }

  return (
    <ol className="grid gap-5">
      {steps.map((step, index) => (
        <li key={step.label}>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-6 place-items-center rounded-full bg-muted text-xs tabular-nums">{index + 1}</span>
            {step.label}
          </h2>
          <ul className="mt-2 divide-y overflow-hidden rounded-xl bg-card ring-1 ring-border">
            {step.treatments.map((t) => (
              <li key={t.key}>
                <Link
                  href={href(t.key)}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{t.name}</span>
                  <span className="row-span-2 text-muted-foreground sm:order-last sm:row-span-1">
                    <ChevronRight className="size-4" />
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                    {t.hospitals} RS{priceText(t) && <> · {priceText(t)}</>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
