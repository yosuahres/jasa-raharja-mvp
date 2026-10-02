"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

/** A text filter whose value lives in the URL. Updates as you type, debounced. */
export function UrlSearchInput({
  param,
  label,
  value,
  placeholder,
  className,
}: {
  param: string;
  label: string;
  value: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [text, setText] = useState(value);
  const [pushed, setPushed] = useState(value);
  const [previous, setPrevious] = useState(value);

  // Follow the URL when it changes from elsewhere (e.g. the navbar search),
  // but not when it's just catching up with what was typed here.
  if (value !== previous) {
    setPrevious(value);
    if (value !== pushed) setText(value);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const onChange = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      const params = new URLSearchParams(searchParams);
      if (trimmed) params.set(param, trimmed);
      else params.delete(param);
      setPushed(trimmed);
      router.replace(`${pathname}?${params}`, { scroll: false });
    }, DEBOUNCE_MS);
  };

  return (
    <label className={cn("grid gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      {label}
      <span className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border-0 bg-muted pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </span>
    </label>
  );
}
