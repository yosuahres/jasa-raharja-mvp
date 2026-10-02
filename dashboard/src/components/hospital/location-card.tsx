import { ExternalLink, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Hospital } from "@/lib/data/types";

/** Where the hospital is, as its document prints it, with a map search for it. */
export function LocationCard({ hospital, className }: { hospital: Hospital; className?: string }) {
  const place = [hospital.address, hospital.city, hospital.province].filter(Boolean);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hospital.name, hospital.city].filter(Boolean).join(" "))}`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Lokasi</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <p className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {place.length ? <span className="min-w-0">{place.join(", ")}</span> : <span className="text-muted-foreground">Tidak tercetak di dokumen</span>}
        </p>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5 font-medium transition-colors outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Cari di Google Maps
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
        </a>
      </CardContent>
    </Card>
  );
}
