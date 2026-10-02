import { Suspense } from "react";

import { UrlSearchInput } from "@/components/url-search-input";
import { UrlSelect } from "@/components/url-select";

/** What is needed and where from. Both write to the URL as they change, so there is no submit button. */
export function TreatmentSearch({ query, location, cities }: { query: string; location: string; cities: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Suspense fallback={<FieldPlaceholder />}>
        <UrlSearchInput param="q" label="Tindakan yang dibutuhkan" value={query} placeholder="mis. kraniotomi, ORIF femur, CT scan kepala" />
      </Suspense>
      <Suspense fallback={<FieldPlaceholder />}>
        <UrlSelect param="lokasi" label="Lokasi kejadian" value={location} options={cities.map((c) => ({ value: c, label: c }))} />
      </Suspense>
    </div>
  );
}

function FieldPlaceholder() {
  return (
    <div className="grid gap-1.5">
      <div className="h-4" />
      <div className="h-9 rounded-lg bg-muted" />
    </div>
  );
}
