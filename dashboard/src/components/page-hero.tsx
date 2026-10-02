import { cn } from "@/lib/utils";

/** Compact page header for the internal dashboard: title and actions, description, then filters. */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 pt-7 sm:px-8", className)}>
      {eyebrow && <p className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}
