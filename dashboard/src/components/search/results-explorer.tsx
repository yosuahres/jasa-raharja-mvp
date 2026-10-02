"use client";

import { useState } from "react";

import { ResultCard } from "./result-card";
import type { SearchResult } from "./results";

/** The ranked results under their filters. Owns which row is highlighted. */
export function ResultsExplorer({
  results,
  title,
  actions,
  toolbar,
  empty,
}: {
  results: SearchResult[];
  title?: React.ReactNode;
  actions?: React.ReactNode;
  toolbar: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section className="border-b">
      <div className="grid grid-cols-1 gap-3 border-b px-4 py-4 sm:px-8">
        {(title || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {title && <h2 className="min-w-0 truncate text-base font-semibold tracking-tight">{title}</h2>}
            {actions && <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}
          </div>
        )}
        {toolbar}
      </div>

      {results.length > 0 ? (
        <ol className="divide-y">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} active={r.id === hoveredId} onHover={setHoveredId} />
          ))}
        </ol>
      ) : (
        <div className="px-4 py-7 sm:px-8">{empty}</div>
      )}
    </section>
  );
}
