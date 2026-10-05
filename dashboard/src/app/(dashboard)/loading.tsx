import { Skeleton } from "@/components/ui/skeleton";

/** Shown at once while a page without its own placeholder loads. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-7 h-64 rounded-2xl" />
    </div>
  );
}
