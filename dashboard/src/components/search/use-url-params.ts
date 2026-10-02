"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

/**
 * Search params with optimistic updates: controls flip immediately while the
 * server re-renders the results for the new URL.
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useOptimistic(searchParams.toString());
  const [isPending, startTransition] = useTransition();

  /** `null` removes a param; any string (even "") sets it. */
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(query);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const nextQuery = next.toString();
    startTransition(() => {
      setQuery(nextQuery);
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  };

  return { params: new URLSearchParams(query), update, isPending };
}
