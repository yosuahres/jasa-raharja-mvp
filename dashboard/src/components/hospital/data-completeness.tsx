import { Check, Info, X } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Completeness } from "@/lib/tariff-book";

export function DataCompleteness({ items, className }: { items: Completeness; className?: string }) {
  const complete = items.filter((i) => i.complete).length;
  const share = items.length ? complete / items.length : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Kelengkapan data</CardTitle>
        <CardAction className="text-sm font-semibold tabular-nums">
          {complete}/{items.length}
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-tier-a" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>

        <ul className="grid gap-3 text-sm sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5">
              {item.complete ? (
                <Check aria-label="Lengkap" className="mt-0.5 size-4 shrink-0 text-tier-a" />
              ) : (
                <X aria-label="Belum lengkap" className="mt-0.5 size-4 shrink-0 text-tier-c" />
              )}
              <span className="min-w-0">
                {item.label}
                <span className="block text-xs text-muted-foreground">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        {complete < items.length && (
          <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            Skor yang bergantung pada data yang belum lengkap kurang andal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
