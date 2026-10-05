"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check, Stethoscope, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import type { Treatment } from "@/lib/data/types";
import { cn } from "@/lib/utils";

import { FIELD } from "./search-field";

const DEBOUNCE_MS = 200;

/**
 * Picks a tindakan from the ones the hospitals' documents price. Empty, it offers those most
 * hospitals price; typing searches them all. Holds no state of its own: the search form owns the pick.
 */
export function TreatmentPicker({
  value,
  onValueChange,
  suggestions,
  compact = false,
}: {
  value: Treatment | null;
  onValueChange: (next: Treatment | null) => void;
  suggestions: Treatment[];
  compact?: boolean;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Treatment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      request.current?.abort();
    },
    [],
  );

  const listed = search.trim() && results ? results : suggestions;
  const items = value && !listed.some((t) => t.key === value.key) ? [value, ...listed] : listed;

  const find = (text: string) => {
    setSearch(text);
    clearTimeout(timer.current);
    request.current?.abort();
    if (!text.trim()) {
      setResults(null);
      setFailed(false);
      return;
    }
    timer.current = setTimeout(() => {
      const controller = new AbortController();
      request.current = controller;
      startTransition(async () => {
        try {
          const response = await fetch(`/api/tindakan?q=${encodeURIComponent(text)}`, { signal: controller.signal });
          if (!response.ok) throw new Error(String(response.status));
          const found: Treatment[] = await response.json();
          startTransition(() => {
            setResults(found);
            setFailed(false);
          });
        } catch {
          if (!controller.signal.aborted) setFailed(true);
        }
      });
    }, DEBOUNCE_MS);
  };

  const status = isPending ? "Mencari…" : failed ? "Gagal memuat tindakan" : null;

  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={(next: Treatment | null) => {
        onValueChange(next);
        setSearch("");
        setResults(null);
      }}
      onInputValueChange={(text, { reason }) => {
        if (reason !== "item-press") find(text);
      }}
      itemToStringLabel={(t: Treatment) => t.name}
      isItemEqualToValue={(a: Treatment, b: Treatment) => a.key === b.key}
      filter={null}
    >
      <Combobox.InputGroup className={cn(FIELD, compact ? "h-11" : "h-14")}>
        <Stethoscope className="size-5 shrink-0 text-muted-foreground" />
        <span className="grid min-w-0 flex-1">
          <label htmlFor={id} className="sr-only">
            Tindakan
          </label>
          <Combobox.Input
            id={id}
            placeholder="Tindakan"
            className="w-full min-w-0 bg-transparent text-sm font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </span>
        <Combobox.Clear aria-label="Hapus tindakan" className="-mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground">
          <X className="size-4" />
        </Combobox.Clear>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="isolate z-50 outline-none" sideOffset={4}>
          <Combobox.Popup
            aria-busy={isPending || undefined}
            className="w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[scale,opacity] duration-100 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
          >
            <div className="max-h-[min(var(--available-height),22rem)] overflow-y-auto overscroll-contain p-1">
              <Combobox.Status>{status && <p className="px-2 py-1.5 text-xs text-muted-foreground">{status}</p>}</Combobox.Status>
              <Combobox.Empty>
                {!isPending && !failed && <p className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada tindakan</p>}
              </Combobox.Empty>
              <Combobox.List>
                {(t: Treatment) => (
                  <Combobox.Item
                    key={t.key}
                    value={t}
                    className="grid cursor-default grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <Combobox.ItemIndicator>
                      <Check className="size-4" />
                    </Combobox.ItemIndicator>
                    <span className="col-start-2 truncate">{t.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{t.hospitals} RS</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
