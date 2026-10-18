import type { ScoreParameter } from "@/lib/scoring";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A 0–100 score as a thin bar. The number sits beside it, so the bar itself says nothing to a reader. */
export function ScoreBar({ value, className }: { value: number; className?: string }) {
  return (
    <span aria-hidden className={cn("block h-1 w-full overflow-hidden rounded-full bg-muted", className)}>
      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

/**
 * The Layanan score parameter by parameter: each with its weight, its score and what its document
 * shows, then the weighted total. Renders dt/dd groups, so it sits inside a <dl>.
 */
export function ScoreParameters({ parameters, total }: { parameters: ScoreParameter[]; total: number }) {
  return (
    <>
      {parameters.map((p) => (
        <div key={p.key} className="flex flex-col gap-1 py-0.5">
          <dt className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate">{p.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatPercent(p.weight)}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{Math.round(p.score)}</span>
          </dt>
          <dd className="flex flex-col gap-1">
            <ScoreBar value={p.score} />
            <span className="text-xs text-muted-foreground">{p.detail}</span>
          </dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-2 border-t pt-2">
        <dt className="font-medium">Skor layanan</dt>
        <dd className="font-medium tabular-nums">
          {Math.round(total)}
          <span className="font-normal text-muted-foreground"> / 100</span>
        </dd>
      </div>
    </>
  );
}
