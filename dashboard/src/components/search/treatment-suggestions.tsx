import Link from "next/link";

import { isSameTreatment, type TreatmentVariant } from "@/lib/treatment-variants";

/** Treatment names as the documents print them; picking one narrows the search to it. */
export function TreatmentSuggestions({
  label,
  variants,
  query,
  hrefFor,
}: {
  label: string;
  variants: TreatmentVariant[];
  query: string;
  hrefFor: (name: string) => string;
}) {
  return (
    <div className="mt-3 lg:max-w-4xl">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {variants.map((v) => {
          const current = isSameTreatment(v.name, query);
          return (
            <li key={v.name} className="min-w-0 max-w-full">
              <Link
                href={hrefFor(v.name)}
                scroll={false}
                replace
                aria-current={current || undefined}
                className="flex h-8 max-w-full items-center gap-1.5 rounded-lg bg-muted px-2.5 text-xs text-foreground/80 transition-colors hover:text-foreground aria-[current]:bg-foreground aria-[current]:text-background"
              >
                <span className="truncate">{v.name}</span>
                <span className="shrink-0 tabular-nums opacity-60">{v.hospitals} RS</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
