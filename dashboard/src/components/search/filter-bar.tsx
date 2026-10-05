"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { ArrowUpDown, Check, ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useRef, useState } from "react";

import { TierDot } from "@/components/tier-badge";
import { Button } from "@/components/ui/button";
import type { Tier } from "@/lib/data/types";

import {
  AREA_OPTIONS,
  countActiveFilters,
  DEFAULT_FILTERS,
  FILTER_PARAMS,
  type FilterFacts,
  filterParams,
  type Filters,
  matchesFilters,
  parseFilters,
  parseSort,
  PRICE_OPTIONS,
  type SortKey,
  SORT_OPTIONS,
  TIERS,
} from "./filters";
import { useUrlParams } from "./use-url-params";

const RESET = Object.fromEntries(FILTER_PARAMS.map((key) => [key, null]));

const SECTIONS = [
  { id: "tier", label: "Tier" },
  { id: "lokasi", label: "Lokasi" },
  { id: "harga", label: "Harga" },
  { id: "lainnya", label: "Lainnya" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * One button that opens every filter in a panel. Choices stay a draft, counted live, until
 * "Lihat hasil" puts them in the URL (so a filtered view can still be shared). Sorting is SortButton.
 */
export function FilterButton({ facts }: { facts: FilterFacts[] }) {
  const { params, update } = useUrlParams();
  const applied = parseFilters((key) => params.get(key));
  const active = countActiveFilters(applied);

  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(applied);
  const [current, setCurrent] = useState<SectionId>("tier");
  const body = useRef<HTMLDivElement>(null);
  // Set while a menu click scrolls the panel, so the sections passed on the way don't light up.
  const jumping = useRef(false);

  const onOpenChange = (next: boolean) => {
    // Every opening starts from what is applied, not from a draft that was closed without applying.
    if (next) {
      setFilters(applied);
      setCurrent("tier");
    }
    setOpen(next);
  };

  const set = (changes: Partial<Filters>) => setFilters((f) => ({ ...f, ...changes }));
  const toggleTier = (tier: Tier) =>
    set({ tiers: filters.tiers.includes(tier) ? filters.tiers.filter((t) => t !== tier) : [...filters.tiers, tier] });
  const count = facts.filter((x) => matchesFilters(x, filters)).length;

  const apply = () => {
    update(filterParams(filters));
    setOpen(false);
  };

  const jumpTo = (id: SectionId) => {
    setCurrent(id);
    jumping.current = true;
    sectionEl(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // The menu follows the scroll: the last section whose top has passed the top of the panel.
  const onScroll = () => {
    if (jumping.current) return;
    const top = body.current?.getBoundingClientRect().top ?? 0;
    const passed = SECTIONS.filter(({ id }) => (sectionEl(id)?.getBoundingClientRect().top ?? Infinity) - top <= 24);
    const last = passed.at(-1);
    if (last) setCurrent(last.id);
  };

  const sectionEl = (id: SectionId) => body.current?.querySelector<HTMLElement>(`[data-section="${id}"]`);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger render={<Button variant="outline" />}>
        <SlidersHorizontal data-icon="inline-start" />
        Filter
        {active > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
            {active}
          </span>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[56rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-background shadow-2xl transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-5">
            <Dialog.Title className="text-xl font-semibold tracking-tight">Filter</Dialog.Title>
            <Dialog.Close
              aria-label="Tutup"
              className="-mr-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 bg-muted px-4 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:px-6">
            <nav aria-label="Bagian filter" className="hidden self-start rounded-xl bg-card p-2 sm:grid">
              {SECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => jumpTo(id)}
                  aria-current={current === id ? "true" : undefined}
                  className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current]:font-semibold aria-[current]:text-foreground"
                >
                  {label}
                </button>
              ))}
            </nav>

            <div
              ref={body}
              onScroll={onScroll}
              onScrollEnd={() => (jumping.current = false)}
              onWheel={() => (jumping.current = false)}
              onTouchMove={() => (jumping.current = false)}
              className="grid min-h-0 content-start gap-3 overflow-y-auto overscroll-contain">
              <Section id="tier" title="Tier">
                <Pills>
                  {TIERS.map((tier) => (
                    <Pill key={tier} pressed={filters.tiers.includes(tier)} onClick={() => toggleTier(tier)}>
                      <TierDot tier={tier} />
                      Tier {tier}
                      <span className="opacity-60 tabular-nums">{facts.filter((x) => x.tier === tier).length}</span>
                    </Pill>
                  ))}
                </Pills>
              </Section>

              <Section id="lokasi" title="Lokasi">
                <Pills>
                  {AREA_OPTIONS.map((o) => (
                    <Pill key={o.value} pressed={(filters.area ?? "") === o.value} onClick={() => set({ area: o.value || null })}>
                      {o.label}
                    </Pill>
                  ))}
                </Pills>
              </Section>

              <Section id="harga" title="Harga">
                <Pills>
                  {PRICE_OPTIONS.map((o) => (
                    <Pill key={o.value} pressed={filters.priceFactor === o.factor} onClick={() => set({ priceFactor: o.factor })}>
                      {o.label}
                    </Pill>
                  ))}
                </Pills>
              </Section>

              <Section id="lainnya" title="Lainnya">
                <Pills>
                  <Pill pressed={filters.partnerOnly} onClick={() => set({ partnerOnly: !filters.partnerOnly })}>
                    Mitra PKS
                  </Pill>
                  <Pill pressed={filters.activeOnly} onClick={() => set({ activeOnly: !filters.activeOnly })}>
                    Tarif berlaku
                  </Pill>
                </Pills>
              </Section>
            </div>
          </div>

          <div className="grid gap-2 px-6 py-4">
            <Button
              variant="secondary"
              className="h-11 text-sm"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Reset
            </Button>
            <Button className="h-11 text-sm" disabled={count === 0} onClick={apply}>
              {count === 0 ? "Tidak ada hasil" : `Lihat ${count} hasil`}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ id, title, children }: { id: SectionId; title: string; children: React.ReactNode }) {
  return (
    <section data-section={id} className="rounded-xl bg-card p-5">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** How the list is ordered, apart from the filters. Rekomendasi unless chosen otherwise; applies at once. */
export function SortButton() {
  const { params, update } = useUrlParams();
  const sort = parseSort(params.get("urut"));
  const label = SORT_OPTIONS.find((o) => o.value === sort)?.label;

  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="outline" />}>
        <ArrowUpDown data-icon="inline-start" />
        <span className="text-muted-foreground">Urutkan:</span> {label}
        <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="isolate z-50 outline-none" sideOffset={4} align="start">
          <Menu.Popup className="min-w-48 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[scale,opacity] duration-100 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.RadioGroup value={sort} onValueChange={(value: SortKey) => update({ urut: value === "rekomendasi" ? null : value })}>
              {SORT_OPTIONS.map((o) => (
                <Menu.RadioItem
                  key={o.value}
                  value={o.value}
                  closeOnClick
                  className="grid cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <Menu.RadioItemIndicator className="col-start-1">
                    <Check className="size-4" />
                  </Menu.RadioItemIndicator>
                  <span className="col-start-2">{o.label}</span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Pills({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Pill({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors hover:border-foreground/40 aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
    >
      {children}
    </button>
  );
}

export function ResetFiltersButton() {
  const { update } = useUrlParams();
  return (
    <Button onClick={() => update(RESET)} variant="outline" size="lg">
      <RotateCcw /> Reset filter
    </Button>
  );
}
