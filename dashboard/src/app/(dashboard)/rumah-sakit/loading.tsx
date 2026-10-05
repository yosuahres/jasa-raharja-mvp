import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHero title="Rumah Sakit">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,22rem)_12rem_12rem]">
          <Field className="col-span-2 md:col-span-1" />
          <Field />
          <Field />
        </div>
      </PageHero>
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-7 sm:px-8">
        <Card className="gap-0 py-0">
          <div className="h-11 border-b" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-b-0">
              <Skeleton className="size-4" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/5" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

function Field({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="mb-1.5 h-3 w-10" />
      <Skeleton className="h-9 rounded-lg" />
    </div>
  );
}
