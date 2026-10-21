"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { AttributionControl, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

import type { Point } from "@/lib/origin";

/** A hospital shown for bearings while picking, greyed. */
export type ContextPin = Point & { id: string; name: string };

// The whole country, for a map with nothing to frame yet.
const INDONESIA = { center: [-2.5, 118] as [number, number], zoom: 5 };
const POINT_ZOOM = 13;

function ClickToPlace({ onPlace }: { onPlace: (point: Point) => void }) {
  useMapEvents({ click: (event) => onPlace({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

/** Frames the hospitals at first, then follows the point wherever it is put. */
function Follow({ point, pins }: { point: Point | null; pins: ContextPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), POINT_ZOOM), { duration: 0.5 });
    else if (pins.length > 0) map.fitBounds(pins.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 10 });
    // Only the point's position should move the map; a new array of the same pins shouldn't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, point?.lat, point?.lng]);
  return null;
}

/** A map to put the accident on: click anywhere to place it, with the hospitals around for bearings. */
export function LocationMap({ value, onChange, pins }: { value: Point | null; onChange: (point: Point) => void; pins: ContextPin[] }) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : INDONESIA.center}
      zoom={value ? POINT_ZOOM : INDONESIA.zoom}
      attributionControl={false}
      scrollWheelZoom
      className="size-full cursor-crosshair"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <AttributionControl prefix={false} />
      {pins.map((pin) => (
        <CircleMarker key={pin.id} center={[pin.lat, pin.lng]} radius={6} pathOptions={{ className: "fill-muted-foreground stroke-background", weight: 2, fillOpacity: 0.8 }}>
          <Tooltip direction="top" offset={[0, -6]}>
            {pin.name}
          </Tooltip>
        </CircleMarker>
      ))}
      {value && <CircleMarker center={[value.lat, value.lng]} radius={9} pathOptions={{ className: "fill-destructive stroke-background", weight: 3, fillOpacity: 1 }} />}
      <ClickToPlace onPlace={onChange} />
      <Follow point={value} pins={pins} />
    </MapContainer>
  );
}
