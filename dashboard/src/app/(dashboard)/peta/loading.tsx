import { FULL_PAGE, TOOLBAR } from "@/components/data-table/styles";
import { Skeleton } from "@/components/ui/skeleton";

/** The map page's shape while it loads: toolbar, then the map beside its list. */
export default function Loading() {
  return (
    <div className={FULL_PAGE}>
      <div className={TOOLBAR}>
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-full min-h-80 rounded-2xl" />
        <div className="grid content-start gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
