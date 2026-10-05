"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { createContext, use, useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_COMPARE = 3;

type CompareHospital = { id: string; name: string };

type CompareSelection = {
  selected: string[];
  toggle: (id: string) => void;
  clear: () => void;
};

const CompareContext = createContext<CompareSelection | null>(null);

const useCompareSelection = () => {
  const context = use(CompareContext);
  if (!context) throw new Error("CompareCheckbox must be rendered inside CompareSelectionProvider");
  return context;
};

/**
 * Holds which hospitals are ticked for comparison and shows the sticky "Bandingkan" bar.
 * Selection is client state so it survives the URL-driven filter changes on the list.
 */
export function CompareSelectionProvider({
  hospitals,
  children,
}: {
  hospitals: CompareHospital[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      return current.length >= MAX_COMPARE ? current : [...current, id];
    });
  }, []);
  const clear = useCallback(() => setSelected([]), []);
  const value = useMemo(() => ({ selected, toggle, clear }), [selected, toggle, clear]);

  return (
    <CompareContext value={value}>
      {children}
      <CompareBar hospitals={hospitals} />
    </CompareContext>
  );
}

export function CompareCheckbox({ id, name }: { id: string; name: string }) {
  const { selected, toggle } = useCompareSelection();
  const checked = selected.includes(id);
  const full = !checked && selected.length >= MAX_COMPARE;

  return (
    // The row opens the detail page when clicked, but not through this label.
    // The padding widens the hit area around the small native checkbox.
    <label
      title={full ? `Maksimal ${MAX_COMPARE} rumah sakit` : undefined}
      className={cn(
        "-m-2 grid size-8 place-items-center rounded-md",
        full ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-muted",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={full}
        onChange={() => toggle(id)}
        aria-label={`Pilih ${name} untuk dibandingkan`}
        className="size-4 cursor-[inherit] rounded accent-foreground"
      />
    </label>
  );
}

function CompareBar({ hospitals }: { hospitals: CompareHospital[] }) {
  const { selected, toggle, clear } = useCompareSelection();
  if (selected.length === 0) return null;

  const picked = selected
    .map((id) => hospitals.find((h) => h.id === id))
    .filter((h): h is CompareHospital => Boolean(h));
  const ready = selected.length >= 2;

  return (
    <div
      role="region"
      aria-label="Rumah sakit terpilih"
      className="sticky bottom-4 z-20 mt-3 flex items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-sm text-background shadow-lg duration-150 animate-in fade-in slide-in-from-bottom-2"
    >
      <p className="shrink-0 font-medium tabular-nums">
        {selected.length}/{MAX_COMPARE} dipilih
      </p>
      <ul className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-hidden md:flex">
        {picked.map((h) => (
          <li key={h.id} className="flex min-w-0 items-center gap-0.5 rounded-md bg-background/10 py-0.5 pr-0.5 pl-2 text-xs">
            <span className="max-w-44 truncate">{h.name}</span>
            <button
              type="button"
              onClick={() => toggle(h.id)}
              aria-label={`Hapus ${h.name} dari perbandingan`}
              className="rounded p-0.5 text-background/60 hover:bg-background/15 hover:text-background"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={clear}
          className="h-8 rounded-lg px-2.5 font-medium text-background/70 hover:bg-background/10 hover:text-background"
        >
          Batal
        </button>
        {ready ? (
          <Link
            href={`/bandingkan?rs=${selected.join(",")}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-background px-3 font-medium text-foreground transition-colors hover:bg-background/85"
          >
            Bandingkan
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center px-2.5 text-background/60">Pilih 1 lagi</span>
        )}
      </div>
    </div>
  );
}
