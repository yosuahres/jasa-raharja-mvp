import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type ImportStep = { id: number; label: string };

/** The first step of every upload from the Input Data page: what kind of data it is. */
export const KIND_STEP: ImportStep = { id: 1, label: "Jenis data" };

/** The same steps after the kind step, numbered from 2. */
export const afterKind = (steps: readonly ImportStep[]): ImportStep[] => [KIND_STEP, ...steps.map((s) => ({ id: s.id + 1, label: s.label }))];

/**
 * The frame of an upload flow: a header with the breadcrumb on the left and the steps in the middle,
 * then the step's content on a muted field. Fills the shell's panel below its 48px header (plus the
 * panel's 8px top and bottom inset on large screens).
 */
export function ImportShell({
  crumb,
  fileName,
  steps,
  current,
  children,
}: {
  crumb: string;
  fileName?: string;
  steps: readonly ImportStep[];
  current: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col lg:min-h-[calc(100dvh-4rem)]">
      {/* Equal side columns keep the steps centered and stop the breadcrumb short of them. */}
      <div className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b px-4">
        <p className="hidden truncate text-sm lg:block">
          <span className="text-muted-foreground">{crumb}</span>
          {fileName && (
            <>
              <span className="mx-1.5 text-muted-foreground">/</span>
              <span className="font-semibold">{fileName}</span>
            </>
          )}
        </p>
        <Steps steps={steps} current={current} />
      </div>

      <div className="flex-1 bg-muted/30 px-4 py-8 sm:px-8 lg:rounded-b-xl">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    </div>
  );
}

function Steps({ steps, current }: { steps: readonly ImportStep[]; current: number }) {
  return (
    <ol className="col-start-2 flex items-center" aria-label="Tahapan">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center" aria-current={s.id === current ? "step" : undefined}>
          {i > 0 && <span aria-hidden className={cn("mx-1.5 h-px w-4 sm:mx-3 sm:w-12", s.id <= current ? "bg-primary" : "bg-border")} />}
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                s.id <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {s.id < current ? <Check className="size-3" strokeWidth={3} /> : s.id}
            </span>
            <span
              className={cn(
                "text-sm whitespace-nowrap",
                s.id === current ? "font-medium text-foreground max-sm:sr-only" : "hidden text-muted-foreground lg:inline",
              )}
            >
              {s.label}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
