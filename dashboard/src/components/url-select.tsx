"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

  const onChange = (next: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set(param, next);
    else params.delete(param);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const control = (
    <Select items={options} value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 cursor-pointer rounded-lg data-[size=default]:h-9 border-0 bg-muted text-sm font-medium text-foreground hover:bg-muted/70 dark:bg-muted dark:hover:bg-muted/70",
          variant === "inline" ? "pr-2.5 pl-3" : "w-full pl-3",
        )}
      >
        {variant === "inline" && <span className="font-normal text-muted-foreground max-sm:sr-only">{label}</span>}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (variant === "inline") return control;

  return (
    <div className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden>{label}</span>
      {control}
    </div>
  );
}
