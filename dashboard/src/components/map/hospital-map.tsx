"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import { useEffect } from "react";
import { AttributionControl, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

import { TipeBadge } from "@/components/tier-badge";
import type { Tipe } from "@/lib/data/types";

export type MapPin = { id: string; name: string; city: string; tipe: Tipe | null; lat: number; lng: number };

/** A pick from the list or the map. A new object per click, so picking the same hospital again flies back to it. */
export type MapFocus = { pin: MapPin };

// The whole country, for a map with nothing on it yet.
const INDONESIA = { center: [-2.5, 118] as [number, number], zoom: 5 };
// Close enough to see the hospital's own street.
const FOCUS_ZOOM = 17;

// Leaflet writes colors as SVG attributes, which can't read CSS variables; classes can, and win over them.
const PIN_STYLE: Record<Tipe | "none", string> = {
  A: "fill-tier-a stroke-background",
  B: "fill-tier-b stroke-background",
  C: "fill-tier-c stroke-background",
  D: "fill-muted-foreground stroke-background",
  none: "fill-muted-foreground stroke-background",
};

/** Frames the pins whenever the filtered set changes. */
function FitPins({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  const key = pins.map((p) => p.id).join(",");
  useEffect(() => {
    if (pins.length === 0) map.setView(INDONESIA.center, INDONESIA.zoom);
    else if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 14);
    else map.fitBounds(pins.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 14 });
    // The key stands in for the pins: a new array with the same hospitals shouldn't move the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** Zooms in on the picked hospital. */
function FocusPin({ focus }: { focus: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.pin.lat, focus.pin.lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.6 });
  }, [map, focus]);
  return null;
}

export function HospitalMap({ pins, focus, onPick }: { pins: MapPin[]; focus: MapFocus | null; onPick: (pin: MapPin) => void }) {
  return (
    <MapContainer
      center={INDONESIA.center}
      zoom={INDONESIA.zoom}
      attributionControl={false}
      scrollWheelZoom
      className="size-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <AttributionControl prefix={false} />
      {pins.map((pin) => (
        <CircleMarker
          key={pin.id}
          center={[pin.lat, pin.lng]}
          radius={8}
          pathOptions={{ className: PIN_STYLE[pin.tipe ?? "none"], weight: 2, fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onPick(pin) }}
        >
          <Popup>
            <div className="grid gap-1.5">
              <p className="font-medium text-balance">{pin.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {pin.tipe && <TipeBadge tipe={pin.tipe} />}
                {pin.city}
              </div>
              <Link href={`/rumah-sakit/${pin.id}`} className="text-xs font-medium underline underline-offset-4">
                Lihat rumah sakit
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      <FitPins pins={pins} />
      <FocusPin focus={focus} />
    </MapContainer>
  );
}
