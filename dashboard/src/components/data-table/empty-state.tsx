import { ListFilter, type LucideIcon, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A tilted icon tile on a fading grid, a title and a line: what a table shows instead of rows. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-1 px-4 py-16 text-center", className)}>
      <div className="relative mb-6 flex items-center justify-center">
        <div
          aria-hidden
          className="absolute -inset-14 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:22px_22px] opacity-70 [mask-image:radial-gradient(closest-side,black,transparent)]"
        />
        <div className="relative flex size-20 -rotate-6 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
          <Icon className="size-9 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-72 text-sm text-muted-foreground text-pretty">{description}</p>
      {children}
    </div>
  );
}

/** When search or filters leave no rows: says so and offers to clear them. */
export function FilterEmptyState({
  title = "Tidak ada hasil yang cocok",
  description = "Tidak ada data yang cocok dengan pencarian atau filter saat ini.",
  onClear,
  className,
}: {
  title?: string;
  description?: string;
  onClear: () => void;
  className?: string;
}) {
  return (
    <EmptyState icon={SearchX} title={title} description={description} className={className}>
      <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
        <ListFilter data-icon="inline-start" />
        Hapus filter
      </Button>
    </EmptyState>
  );
}
