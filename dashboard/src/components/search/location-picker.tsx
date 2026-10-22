"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCoords, type Origin, type Point } from "@/lib/origin";
import { ALL_LOCATIONS_PARAM } from "@/lib/scoring";
import { cn } from "@/lib/utils";

import type { ContextPin } from "./location-map";

// Leaflet reaches for `window` as it loads, so the map only renders in the browser.
const LocationMap = dynamic(() => import("./location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

/** Where the search is from: anywhere, one of the documents' cities, or a point on the map. */
export type LocationValue = { kind: "all" } | { kind: "city"; city: string } | { kind: "point"; origin: Origin };

export const ALL_LOCATIONS: LocationValue = { kind: "all" };

/** The value as the field shows it. */
export const locationLabel = (value: LocationValue) =>
  value.kind === "all" ? "Semua lokasi" : value.kind === "city" ? value.city : value.origin.label;

/** The value for the URL's `lokasi` and origin, the inverse of what the page parses. */
export const locationValueOf = (lokasi: string, origin: Origin | null): LocationValue =>
  origin ? { kind: "point", origin } : lokasi && lokasi !== ALL_LOCATIONS_PARAM ? { kind: "city", city: lokasi } : ALL_LOCATIONS;

/** The name of a point, from the geocoder; its coordinates when it has none or can't be asked. */
const nameOf = async (point: Point): Promise<string> => {
  try {
    const response = await fetch(`/api/lokasi?${new URLSearchParams({ lat: String(point.lat), lng: String(point.lng) })}`);
    const place = response.ok ? ((await response.json()) as Origin | null) : null;
    return place?.label || formatCoords(point);
  } catch {
    return formatCoords(point);
  }
};

/**
 * Picks where the accident happened: an address or place searched by name, the device's own
 * location, a click on the map, or just a city. Nothing applies until "Pakai lokasi ini".
 */
export function LocationPicker({
  value,
  onChange,
  cities,
  pins,
  trigger,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  cities: string[];
  pins: ContextPin[];
  /** The field's own button; the picker opens from it. */
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Origin[]>([]);
  const [searching, startSearch] = useTransition();
  const [naming, startNaming] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setDraft(value);
      setQuery("");
      setPlaces([]);
      setNotice(null);
    }
    setOpen(next);
  };

  const point = draft.kind === "point" ? draft.origin : null;
  // The dropdown shows nothing while a map point is chosen; picking a city replaces the point.
  const cityValue = draft.kind === "all" ? ALL_LOCATIONS_PARAM : draft.kind === "city" ? draft.city : null;
  const pickCity = (next: string | null) => {
    if (next === null) return;
    setDraft(next === ALL_LOCATIONS_PARAM ? ALL_LOCATIONS : { kind: "city", city: next });
  };

  const place = (next: Point, label?: string) => {
    setDraft({ kind: "point", origin: { ...next, label: label ?? formatCoords(next) } });
    if (label) return;
    // The name arrives after the pin is placed, so the map answers at once.
    startNaming(async () => {
      const named = await nameOf(next);
      setDraft((current) => (current.kind === "point" && current.origin.lat === next.lat && current.origin.lng === next.lng ? { kind: "point", origin: { ...next, label: named } } : current));
    });
  };

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 3) return;
    setNotice(null);
    startSearch(async () => {
      try {
        const response = await fetch(`/api/lokasi?${new URLSearchParams({ q })}`);
        if (!response.ok) throw new Error();
        const found = (await response.json()) as Origin[];
        setPlaces(found);
        if (found.length === 0) setNotice("Tempat tidak ditemukan. Klik titiknya di peta.");
      } catch {
        setPlaces([]);
        setNotice("Pencarian tempat sedang tidak tersedia. Klik titiknya di peta.");
      }
    });
  };

  const locate = () => {
    if (!("geolocation" in navigator)) return setNotice("Perangkat ini tidak membagikan lokasi.");
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => place({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setNotice("Lokasi perangkat tidak bisa dibaca."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[92dvh] w-[52rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-background shadow-2xl transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
            <Dialog.Title className="text-base font-semibold">Lokasi kejadian</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon-sm" aria-label="Tutup" />}>
              <X />
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
            <form onSubmit={search} role="search" className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari alamat, jalan, atau tempat"
                aria-label="Cari tempat"
                autoFocus
                className="bg-background"
              />
              <Button type="submit" variant="outline" disabled={searching || query.trim().length < 3}>
                {searching ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Search />}
                Cari
              </Button>
              <Button type="button" variant="outline" onClick={locate} title="Gunakan lokasi perangkat ini">
                <Crosshair />
                <span className="max-sm:sr-only">Lokasi saya</span>
              </Button>
            </form>

            {places.length > 0 && (
              <ul className="divide-y overflow-hidden rounded-lg border">
                {places.map((p) => (
                  <li key={`${p.lat},${p.lng}`}>
                    <button
                      type="button"
                      onClick={() => {
                        place({ lat: p.lat, lng: p.lng }, p.label);
                        setPlaces([]);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                    >
                      <MapPin className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate">{p.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

            {/* `isolate` keeps Leaflet's high z-index panes inside the dialog. */}
            <div className="isolate h-72 shrink-0 overflow-hidden rounded-xl border sm:h-80">
              <LocationMap value={point} onChange={(next) => place(next)} pins={pins} />
            </div>
            <p className="text-xs text-muted-foreground">Klik di peta untuk menandai titik kejadian. Titik abu-abu adalah rumah sakit.</p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Atau pilih kota:</span>
              <Select value={cityValue} onValueChange={pickCity}>
                <SelectTrigger size="sm" aria-label="Pilih kota" className="min-w-40 bg-background">
                  <SelectValue>{(selected: string | null) => (selected === null ? <span className="text-muted-foreground">Pilih kota</span> : selected === ALL_LOCATIONS_PARAM ? "Semua lokasi" : selected)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LOCATIONS_PARAM}>Semua lokasi</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="flex min-w-0 items-center gap-1.5 text-sm">
              {naming ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" /> : <MapPin className="size-4 shrink-0 text-muted-foreground" />}
              <span className={cn("truncate", draft.kind === "point" && "font-medium")}>{locationLabel(draft)}</span>
            </p>
            <Button onClick={apply}>Pakai lokasi ini</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
