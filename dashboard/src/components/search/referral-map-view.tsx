"use client";

import dynamic from "next/dynamic";

import type { Origin } from "@/lib/origin";

import type { RankedPin } from "./referral-map";

// Leaflet reaches for `window` as it loads, so the map only renders in the browser.
const ReferralMap = dynamic(() => import("./referral-map").then((m) => m.ReferralMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

/** The ranked hospitals around the accident, above the list. */
export function ReferralMapView({ origin, pins }: { origin: Origin; pins: RankedPin[] }) {
  return (
    // `isolate` keeps Leaflet's high z-index panes under the app's drawer and dialogs.
    <div className="isolate h-64 overflow-hidden rounded-xl bg-card ring-1 ring-border sm:h-72">
      <ReferralMap origin={origin} pins={pins} />
    </div>
  );
}
