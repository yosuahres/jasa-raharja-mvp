"use client";

import { useRef } from "react";

/**
 * The strip on a header cell's right edge that drags the column wider or narrower.
 * Render it inside a positioned <th> (sticky counts). `onResize` gets the new width in px on every move.
 */
export function ColumnResizeHandle({ onResize }: { onResize: (width: number) => void }) {
  const start = useRef({ x: 0, width: 0 });

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const th = event.currentTarget.closest("th");
    start.current = { x: event.clientX, width: th?.offsetWidth ?? 0 };

    const onMove = (move: PointerEvent) => onResize(start.current.width + move.clientX - start.current.x);
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    // The cursor stays a resize arrow even when the pointer runs ahead of the handle.
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      aria-hidden
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
      className="absolute top-0 -right-px z-10 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40 active:bg-primary pointer-coarse:w-3"
    />
  );
}
