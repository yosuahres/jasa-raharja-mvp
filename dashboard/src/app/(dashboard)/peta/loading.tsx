import { PageHero } from "@/components/page-hero";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHero title="Peta Rumah Sakit">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[12rem_12rem]">
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton className="mb-1.5 h-3 w-10" />
              <Skeleton className="h-9 rounded-lg" />
            </div>
          ))}
        </div>
      </PageHero>
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-7 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Skeleton className="h-[min(70svh,44rem)] min-h-80 rounded-2xl" />
          <div className="grid content-start gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
