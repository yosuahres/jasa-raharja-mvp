"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/**
 * A select whose value lives in the URL, so filtered views can be shared.
 * `inline` puts the label inside the control, for toolbars (e.g. sorting).
 */
export function UrlSelect({
  param,
  label,
  options,
  value,
  variant = "default",
}: {
  param: string;
  label: string;
  options: Option[];
  value: string;
  variant?: "default" | "inline";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set(param, next);
    else params.delete(param);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const select = (className: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  if (variant === "inline") {
    return (
      <label className="relative inline-flex h-9 items-center gap-1.5 rounded-lg bg-muted pr-2.5 pl-3 text-sm focus-within:ring-3 focus-within:ring-ring/50">
        <span className="text-muted-foreground max-sm:sr-only">{label}</span>
        {select("cursor-pointer appearance-none border-0 bg-transparent pr-5 font-medium text-foreground outline-none")}
        <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" />
      </label>
    );
  }

  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <span className="relative">
        {select(
          "h-9 w-full appearance-none rounded-lg border-0 bg-muted py-1 pr-8 pl-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}
