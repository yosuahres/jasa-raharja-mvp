import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-4 pt-10 pb-[12vh] sm:px-8 lg:min-h-[calc(100dvh-4rem)]">
      <div className="w-full max-w-4xl">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-balance">Cari Rujukan</h1>
        <Skeleton className="mt-7 h-18 rounded-2xl" />
      </div>
    </div>
  );
}
