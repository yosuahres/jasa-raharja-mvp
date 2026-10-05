import { Skeleton } from "@/components/ui/skeleton";

/** The table page's shape while it loads: toolbar, header row, rows, pager — full page, like the table. */
export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-80 flex-col lg:h-[calc(100dvh-4rem)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <Skeleton className="h-8 w-full rounded-md sm:w-64" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="h-9 shrink-0 border-b" />
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-2.5">
            <Skeleton className="size-4" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex h-12 shrink-0 items-center justify-between border-t px-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-40 rounded-md" />
      </div>
    </div>
  );
}
