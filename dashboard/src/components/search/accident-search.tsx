"use client";

import { Ambulance, Loader2, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCIDENT_CASES, type AccidentCase } from "@/lib/accident-cases";
import { type Origin, originParams } from "@/lib/origin";
import { cn } from "@/lib/utils";

import type { ContextPin } from "./location-map";
import { LocationPicker, locationLabel, type LocationValue, locationValueOf } from "./location-picker";
import { FIELD, PLACEHOLDER } from "./search-field";

// Opens below the whole field box, as wide as it.
const DROPDOWN = { alignItemWithTrigger: false, align: "start", sideOffset: 4 } as const;

const SELECT_TRIGGER =
  "h-auto w-full min-w-0 cursor-pointer rounded-none border-0 bg-transparent p-0 text-sm font-medium text-foreground focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent";

/**
 * What happened and where: an accident case, and where it happened (a point on the map, or just a
 * city). Nothing runs until Cari: then the pick goes into the URL and anything from an earlier
 * search is dropped. `compact` is the bar above the results.
 */
export function AccidentSearch({
  accidentCase,
  location,
  origin,
  cities,
  pins,
  compact = false,
}: {
  accidentCase: AccidentCase | null;
  /** The `lokasi` param: a city, or "semua". */
  location: string;
  origin: Origin | null;
  cities: string[];
  /** Hospitals with a pin, for bearings on the picker's map. */
  pins: ContextPin[];
  compact?: boolean;
}) {
  const router = useRouter();
  const locationId = useId();
  const caseId = useId();
  const caseField = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [caseDraft, setCaseDraft] = useState(accidentCase?.id ?? null);
  const [where, setWhere] = useState<LocationValue>(locationValueOf(location, origin));

  // Follow the URL when it changes from elsewhere (back button, a shared link).
  const [previous, setPrevious] = useState({ accidentCase, location, origin });
  if (accidentCase?.id !== previous.accidentCase?.id || location !== previous.location || origin?.lat !== previous.origin?.lat || origin?.lng !== previous.origin?.lng) {
    setPrevious({ accidentCase, location, origin });
    setCaseDraft(accidentCase?.id ?? null);
    setWhere(locationValueOf(location, origin));
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!caseDraft) return;
    const params = new URLSearchParams({ kasus: caseDraft });
    if (where.kind === "city") params.set("lokasi", where.city);
    if (where.kind === "point") for (const [key, value] of Object.entries(originParams(where.origin))) params.set(key, value);
    startTransition(() => router.push(`/rekomendasi?${params}`));
  };

  const height = compact ? "h-11" : "h-14";

  return (
    <form
      onSubmit={submit}
      role="search"
      className={cn(
        "grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
        !compact && "rounded-2xl bg-card p-2 shadow-xl ring-1 ring-border",
      )}
    >
      <div ref={caseField} className={cn(FIELD, height)}>
        <Ambulance className="size-5 shrink-0 text-muted-foreground" />
        <span className="grid min-w-0 flex-1">
          <span id={caseId} className="sr-only">
            Kasus kecelakaan
          </span>
          <Select value={caseDraft} onValueChange={(next: string | null) => setCaseDraft(next)}>
            <SelectTrigger aria-labelledby={caseId} className={SELECT_TRIGGER}>
              <SelectValue>
                {(value: string | null) =>
                  ACCIDENT_CASES.find((c) => c.id === value)?.name ?? <span className={PLACEHOLDER}>Kasus kecelakaan</span>
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent {...DROPDOWN} anchor={caseField}>
              {ACCIDENT_CASES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </div>

      <LocationPicker
        value={where}
        onChange={setWhere}
        cities={cities}
        pins={pins}
        trigger={
          <button type="button" aria-labelledby={locationId} className={cn(FIELD, height, "cursor-pointer text-left outline-none")}>
            <MapPin className="size-5 shrink-0 text-muted-foreground" />
            <span id={locationId} className="sr-only">
              Lokasi kejadian
            </span>
            <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", where.kind === "all" && PLACEHOLDER)}>{locationLabel(where)}</span>
          </button>
        }
      />

      <button type="submit" disabled={!caseDraft || isPending} className={cn(buttonVariants(), height, "rounded-xl px-6 text-sm")}>
        {isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Search />}
        Cari
      </button>
    </form>
  );
}
