import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col md:h-[calc(100dvh-3rem)] md:flex-row lg:h-[calc(100dvh-4rem)]">
      <div className="flex w-full shrink-0 flex-col border-b md:w-72 md:border-r md:border-b-0">
        <div className="flex flex-col gap-2 border-b px-4 pt-2.5 pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-7 w-full rounded-md" />
        </div>
        {[4, 6, 4].map((rows, i) => (
          <div key={i} className="flex flex-col gap-3 border-b px-4 py-3">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: rows }, (_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 items-center gap-2 border-b px-4">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
        <div className="p-4">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
