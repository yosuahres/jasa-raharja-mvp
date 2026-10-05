import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-80 max-w-full" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      <Skeleton className="mt-6 h-9 w-80 max-w-full rounded-lg" />
      <Skeleton className="mt-4 h-96 rounded-xl" />
    </div>
  );
}
