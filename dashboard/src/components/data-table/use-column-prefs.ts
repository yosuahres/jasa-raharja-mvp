"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type ColumnDef<Id extends string> = {
  id: Id;
  label: string;
  /** Always shown: can't be hidden. */
  required?: boolean;
  /** Width in px until the user drags it. */
  width: number;
};

/** Which columns show, and in what order. `order` holds every column, hidden ones too. */
export type ColumnLayout<Id extends string> = { order: Id[]; visible: Record<Id, boolean> };

export const MIN_COL_WIDTH = 64;
export const MAX_COL_WIDTH = 480;

const clampWidth = (width: number) => Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, Math.round(width)));

// ------------------------------------------------------------------ storage

// Same-tab writes don't fire "storage", so the hooks listening here are told directly.
const listeners = new Set<() => void>();
// Used when localStorage is unavailable (private mode): the choices still apply for this visit.
const memory = new Map<string, string>();

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
};

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
};

const write = (key: string, value: unknown) => {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    // Kept in memory instead.
  }
  listeners.forEach((listener) => listener());
};

const remove = (key: string) => {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing stored then.
  }
  listeners.forEach((listener) => listener());
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const parse = (raw: string | null) => {
  if (!raw) return {};
  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return {};
  }
};

/** Read on the client only: the server and the first render use the defaults, so hydration matches. */
const useStored = (key: string) =>
  useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

// ------------------------------------------------------------------ the hook

/**
 * A table's column order, visibility and widths, kept in localStorage under `storageKey`.
 * Layout and widths are stored apart, so dragging a width doesn't re-render the rows.
 * Columns added to the table later show up with their default visibility; unknown ones are dropped.
 * `columns` and `defaults` should be module constants.
 */
export function useColumnPrefs<Id extends string>(storageKey: string, columns: readonly ColumnDef<Id>[], defaults: ColumnLayout<Id>) {
  const layoutKey = `${storageKey}:kolom`;
  const widthsKey = `${storageKey}:lebar`;
  const rawLayout = useStored(layoutKey);
  const rawWidths = useStored(widthsKey);

  const layoutOf = useCallback(
    (raw: string | null): ColumnLayout<Id> => {
      const stored = parse(raw);
      const ids = columns.map((c) => c.id);
      const isId = (value: unknown): value is Id => typeof value === "string" && ids.includes(value as Id);
      const storedOrder = Array.isArray(stored.order) ? stored.order.filter(isId) : [];
      const storedVisible = asRecord(stored.visible);
      return {
        order: [...new Set([...storedOrder, ...defaults.order, ...ids])],
        visible: Object.fromEntries(
          columns.map((c) => {
            const saved = storedVisible[c.id];
            return [c.id, Boolean(c.required) || (typeof saved === "boolean" ? saved : Boolean(defaults.visible[c.id]))];
          }),
        ) as Record<Id, boolean>,
      };
    },
    [columns, defaults],
  );

  const layout = useMemo(() => layoutOf(rawLayout), [layoutOf, rawLayout]);
  const visibleIds = useMemo(() => layout.order.filter((id) => layout.visible[id]), [layout]);

  const widths = useMemo(() => {
    const stored = parse(rawWidths);
    return Object.fromEntries(
      columns.flatMap((c) => (typeof stored[c.id] === "number" ? [[c.id, clampWidth(stored[c.id] as number)]] : [])),
    ) as Partial<Record<Id, number>>;
  }, [columns, rawWidths]);

  const widthOf = useCallback(
    (id: Id) => widths[id] ?? columns.find((c) => c.id === id)?.width ?? MIN_COL_WIDTH,
    [columns, widths],
  );

  // Setters read what is stored now rather than what was rendered, so a drag's many moves don't
  // build on a stale copy.
  const setLayout = useCallback(
    (next: ColumnLayout<Id>) => write(layoutKey, layoutOf(JSON.stringify(next))),
    [layoutKey, layoutOf],
  );
  const hide = useCallback(
    (id: Id) => {
      const current = layoutOf(read(layoutKey));
      write(layoutKey, { ...current, visible: { ...current.visible, [id]: false } });
    },
    [layoutKey, layoutOf],
  );
  const setWidth = useCallback(
    (id: Id, width: number) => write(widthsKey, { ...parse(read(widthsKey)), [id]: clampWidth(width) }),
    [widthsKey],
  );
  const reset = useCallback(() => {
    remove(layoutKey);
    remove(widthsKey);
  }, [layoutKey, widthsKey]);

  const isDefault = useMemo(() => {
    const defaultIds = layoutOf(null).order.filter((id) => defaults.visible[id] || columns.find((c) => c.id === id)?.required);
    return rawWidths === null && visibleIds.join() === defaultIds.join();
  }, [columns, defaults, layoutOf, rawWidths, visibleIds]);

  return { layout, visibleIds, widthOf, setLayout, setWidth, hide, reset, isDefault };
}
