"use client";

import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown, ListFilter, Search } from "lucide-react";
import { useState } from "react";

import { panelPopup, toolbarButton } from "@/components/data-table/styles";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type FacetChoice = {
  value: string;
  label: string;
  /** Rows with this value, shown beside it. */
  count?: number;
  /** A colour dot before the label, as a background class (e.g. `bg-tier-a`). */
  dot?: string;
};

export type Facet = {
  id: string;
  label: string;
  choices: FacetChoice[];
  /** One choice at a time, with "Semua" to clear it. Otherwise any number can be ticked. */
  single?: boolean;
};

/** With more choices than this, the dropdown gets a search box. */
const SEARCH_FROM = 7;

/**
 * "Filter" in a table toolbar: a side panel with a dropdown per facet. Choices apply at once;
 * the button counts the facets in use.
 */
export function FilterPanel({
  facets,
  values,
  onChange,
  onClear,
  description = "Persempit daftar dengan memilih nilai di setiap bagian.",
}: {
  facets: Facet[];
  values: Record<string, string[]>;
  onChange: (facet: string, values: string[]) => void;
  onClear: () => void;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = facets.filter((f) => (values[f.id]?.length ?? 0) > 0).length;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={toolbarButton()}>
        <ListFilter />
        Filter
        {active > 0 && (
          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-medium text-primary-foreground tabular-nums">
            {active}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Filter</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
            {facets.map((facet) => (
              <section key={facet.id}>
                <h3 className="mb-2 text-sm font-semibold">{facet.label}</h3>
                <FacetDropdown facet={facet} selected={values[facet.id] ?? []} onChange={(next) => onChange(facet.id, next)} />
              </section>
            ))}
          </div>

          <SheetFooter className="flex-row items-center justify-between gap-2 border-t px-5 py-3">
            <Button variant="ghost" size="sm" disabled={active === 0} onClick={onClear}>
              Hapus semua
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Selesai
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FacetDropdown({ facet, selected, onChange }: { facet: Facet; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const all: FacetChoice = { value: "", label: "Semua" };
  const list = facet.single ? [all, ...facet.choices] : facet.choices;
  const query = search.trim().toLowerCase();
  const visible = query ? list.filter((c) => c.label.toLowerCase().includes(query)) : list;
  const choiceOf = (value: string) => facet.choices.find((c) => c.value === value);

  const pick = (value: string) => {
    if (facet.single) {
      onChange(value ? [value] : []);
      setOpen(false);
      return;
    }
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const only = selected.length === 1 ? choiceOf(selected[0]) : undefined;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSearch("");
      }}
    >
      <Popover.Trigger className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 text-sm transition-colors outline-none hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30">
        {only?.dot && <span className={cn("size-2.5 shrink-0 rounded-full", only.dot)} />}
        {selected.length === 0 ? (
          <span className="text-muted-foreground">Semua</span>
        ) : only ? (
          <span className="truncate">{only.label}</span>
        ) : (
          <span>{selected.length} dipilih</span>
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="isolate z-50" sideOffset={4} align="start" collisionPadding={8}>
          <Popover.Popup className={cn(panelPopup, "flex max-h-(--available-height) w-(--anchor-width) flex-col rounded-lg py-1")}>
            {list.length >= SEARCH_FROM && (
              <div className="shrink-0 px-2 pt-1 pb-1.5">
                <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5">
                  <Search className="size-3.5 shrink-0 opacity-50" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari…"
                    aria-label={`Cari ${facet.label.toLowerCase()}`}
                    className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
                  />
                </div>
              </div>
            )}
            <div className="max-h-64 min-h-0 overflow-y-auto overscroll-contain">
              {visible.map((c) => {
                const isSelected = c.value === "" ? selected.length === 0 : selected.includes(c.value);
                return (
                  <button
                    key={c.value || "__semua__"}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => pick(c.value)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-accent focus-visible:bg-accent",
                      isSelected && "font-medium",
                    )}
                  >
                    {c.dot && <span className={cn("size-2.5 shrink-0 rounded-full", c.dot)} />}
                    <span className="truncate">{c.label}</span>
                    {c.count !== undefined && <span className="text-xs font-normal text-muted-foreground tabular-nums">{c.count}</span>}
                    {isSelected && <Check className="ml-auto size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
              {visible.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Tidak ada pilihan yang cocok.</p>}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
