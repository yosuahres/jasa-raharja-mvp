import { Check, CircleAlert, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "success" | "pending" | "error";

const PILL: Record<Tone, string> = {
  success: "bg-tier-a-soft text-tier-a-ink",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  error: "bg-tier-c-soft text-tier-c-ink",
};

/** A step's title row: what this step is, how it stands, and what to do next. */
export function StepHeader({
  title,
  status,
  description,
  actions,
}: {
  title: string;
  status?: { label: string; tone: Tone };
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          {status && <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", PILL[status.tone])}>{status.label}</span>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
    </div>
  );
}

const NOTICE: Record<"info" | "success" | "warning" | "error", { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-muted-foreground [&>svg]:text-muted-foreground" },
  success: { icon: Check, className: "text-muted-foreground [&>svg]:text-tier-a" },
  warning: {
    icon: TriangleAlert,
    className:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200 [&>svg]:text-amber-600",
  },
  error: { icon: CircleAlert, className: "border-tier-c/30 bg-tier-c-soft text-tier-c-ink" },
};

/** A one-line note above a step's content. */
export function Notice({ tone, children }: { tone: keyof typeof NOTICE; children: React.ReactNode }) {
  const { icon: Icon, className } = NOTICE[tone];
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 text-pretty">{children}</div>
    </div>
  );
}
