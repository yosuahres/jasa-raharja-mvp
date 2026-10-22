"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TipeBadge } from "@/components/tier-badge";
import { compareHref } from "@/lib/compare";
import type { Tipe } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** A hospital the picker can add, in ranking order. */
export type PickerOption = { id: string; name: string; city: string; tipe: Tipe | null };

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Every word typed has to appear in the name or the city, in any order: "soedono madiun", "rsud tulungagung". */
const matches = (option: PickerOption, query: string) => {
  const haystack = normalize(`${option.name} ${option.city}`);
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

/**
 * Adds a hospital to the comparison by typing its name or city. The pick goes straight into the
 * URL, so the page re-renders with the new column; the input empties for the next one.
 */
export function HospitalPicker({
  options,
  ids,
  query,
  autoFocus = false,
  compact = false,
}: {
  options: PickerOption[];
  /** The hospitals already compared; they are left out of the list. */
  ids: string[];
  /** The treatment searched, carried along in the link. */
  query: string;
  autoFocus?: boolean;
  /** Fits the dashed slot in the table header. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const items = options.filter((o) => !ids.includes(o.id));

  const add = (option: PickerOption | null) => {
    if (!option) return;
    setInputValue("");
    router.push(compareHref([...ids, option.id], query), { scroll: false });
  };

  return (
    <Combobox.Root
      items={items}
      value={null}
      onValueChange={add}
      inputValue={inputValue}
      onInputValueChange={(text, { reason }) => {
        if (reason !== "item-press") setInputValue(text);
      }}
      itemToStringLabel={(o: PickerOption) => o.name}
      isItemEqualToValue={(a: PickerOption, b: PickerOption) => a.id === b.id}
      filter={matches}
      autoHighlight
    >
      <Combobox.InputGroup
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-background px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          compact ? "h-8" : "h-10",
        )}
      >
        {compact ? <Plus className="size-4 shrink-0 text-muted-foreground" /> : <Search className="size-4 shrink-0 text-muted-foreground" />}
        <Combobox.Input
          autoFocus={autoFocus}
          aria-label="Tambah rumah sakit"
          placeholder={compact ? "Tambah rumah sakit" : "Ketik nama rumah sakit atau kota"}
          className="w-full min-w-0 bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground"
        />
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="isolate z-50 outline-none" sideOffset={4} align="start">
          <Combobox.Popup className="w-(--anchor-width) min-w-72 max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[scale,opacity] duration-100 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="max-h-[min(var(--available-height),20rem)] overflow-y-auto overscroll-contain p-1">
              <Combobox.Empty>
                <p className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada rumah sakit</p>
              </Combobox.Empty>
              <Combobox.List>
                {(o: PickerOption) => (
                  <Combobox.Item
                    key={o.id}
                    value={o}
                    className="grid cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{o.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{o.city || "—"}</span>
                    </span>
                    {o.tipe ? <TipeBadge tipe={o.tipe} /> : <span className="text-xs text-muted-foreground">Tanpa tarif</span>}
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
