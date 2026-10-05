"use client";

import { Menu } from "@base-ui/react/menu";
import { ArrowDownWideNarrow, ArrowUpDown, ArrowUpNarrowWide, X } from "lucide-react";

import { menuItem, menuPopup, toolbarButton } from "@/components/data-table/styles";

export type SortDirection = "asc" | "desc";

export type SortState<Key extends string = string> = { key: Key; dir: SortDirection };

export type SortOption<Key extends string = string> = { value: Key; label: string };

/** Choosing the same option again goes ascending, then descending, then back to the default order. */
export const nextSort = <Key extends string>(current: SortState<Key> | null, key: Key): SortState<Key> | null => {
  if (current?.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
};

export function SortDirectionIcon({ dir, className }: { dir: SortDirection; className?: string }) {
  return dir === "asc" ? <ArrowUpNarrowWide className={className} /> : <ArrowDownWideNarrow className={className} />;
}

/** "Urutkan" in a table toolbar. Without a sort the table keeps its default order. */
export function SortMenu<Key extends string>({
  sort,
  onChange,
  options,
}: {
  sort: SortState<Key> | null;
  onChange: (sort: SortState<Key> | null) => void;
  options: SortOption<Key>[];
}) {
  const label = sort ? (options.find((o) => o.value === sort.key)?.label ?? sort.key) : null;

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className={toolbarButton(Boolean(sort))}>
        {sort ? (
          <>
            <SortDirectionIcon dir={sort.dir} />
            <span>
              <span className="opacity-70 max-sm:hidden">Diurutkan berdasarkan </span>
              <span className="font-semibold">{label}</span>
            </span>
          </>
        ) : (
          <>
            <ArrowUpDown />
            Urutkan
          </>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="isolate z-50 outline-none" sideOffset={4} align="start">
          <Menu.Popup className={menuPopup}>
            {options.map((o) => (
              <Menu.Item key={o.value} className={menuItem} onClick={() => onChange(nextSort(sort, o.value))}>
                {o.label}
                {sort?.key === o.value && <SortDirectionIcon dir={sort.dir} className="ml-auto size-3.5! text-muted-foreground" />}
              </Menu.Item>
            ))}
            {sort && (
              <>
                <Menu.Separator className="-mx-1 my-1 h-px bg-border" />
                <Menu.Item className={menuItem} onClick={() => onChange(null)}>
                  <X className="text-muted-foreground" />
                  Hapus urutan
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
