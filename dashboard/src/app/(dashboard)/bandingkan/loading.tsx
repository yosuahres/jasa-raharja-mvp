import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
      <div className="mb-6 sm:max-w-md">
        <Skeleton className="mb-1.5 h-3 w-24" />
        <Skeleton className="h-9 rounded-lg" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
