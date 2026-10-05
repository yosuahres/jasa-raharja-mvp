"use client";

import { useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const MIN_WIDTH = 288;
const MAX_WIDTH = 600;
const STORAGE_KEY = "hospitalSidebarWidth";

// The width lives outside React so every hospital page opens at the width the user last dragged to.
let width: number | null = null;
const listeners = new Set<() => void>();

const readStoredWidth = () => {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : MIN_WIDTH;
  } catch {
    return MIN_WIDTH;
  }
};

const subscribeWidth = (onChange: () => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};

const readWidth = () => (width ??= readStoredWidth());

const setWidth = (next: number) => {
  width = next;
  listeners.forEach((onChange) => onChange());
};

const storeWidth = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // Storage can be unavailable (private mode); the width still holds for this visit.
  }
};

/**
 * The hospital page's two panes: the profile on the left, its edge draggable to widen it, and the
 * tabs on the right. From md up each pane scrolls on its own; below that they stack.
 */
export function DetailPane({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const sidebarWidth = useSyncExternalStore(subscribeWidth, readWidth, () => MIN_WIDTH);
  const [resizing, setResizing] = useState(false);

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    setResizing(true);

    const onMove = (move: PointerEvent) =>
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + move.clientX - startX)));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setResizing(false);
      storeWidth();
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Full height less the shell's 3rem header, and on lg its 0.5rem top and bottom inset.
  return (
    <div className="flex flex-col md:h-[calc(100dvh-3rem)] md:flex-row lg:h-[calc(100dvh-4rem)]">
      <div
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Ubah lebar panel"
        className="peer order-2 z-10 -ml-1 hidden w-2 shrink-0 cursor-col-resize md:block"
      />
      <aside
        style={{ "--sidebar-w": `${sidebarWidth}px` } as React.CSSProperties}
        className={cn(
          "@container order-1 flex w-full shrink-0 flex-col border-b transition-colors peer-hover:border-blue-500 md:w-(--sidebar-w) md:overflow-y-auto md:border-r md:border-b-0",
          resizing && "border-blue-500",
        )}
      >
        {sidebar}
      </aside>
      <div className="order-3 flex min-w-0 flex-1 flex-col md:overflow-hidden">{children}</div>
    </div>
  );
}
