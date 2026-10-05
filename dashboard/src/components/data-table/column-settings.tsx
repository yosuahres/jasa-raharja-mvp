"use client";

import { Popover } from "@base-ui/react/popover";
import { ChevronDown, ChevronLeft, ChevronUp, GripHorizontal, Plus, RotateCcw, Settings2, X } from "lucide-react";
import { useState } from "react";

import { panelPopup, toolbarButton } from "@/components/data-table/styles";
import type { ColumnDef, ColumnLayout } from "@/components/data-table/use-column-prefs";
import { cn } from "@/lib/utils";

const footerButton =
  "flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:bg-accent [&_svg]:size-3.5";

/**
 * "Kolom" in a table toolbar: the shown columns in order, dragged to reorder (arrows on touch screens)
 * and removed with ×; hidden ones come back from "Tambah kolom".
 */
export function ColumnSettings<Id extends string>({
  columns,
  layout,
  onChange,
  canReset,
  onReset,
}: {
  columns: readonly ColumnDef<Id>[];
  layout: ColumnLayout<Id>;
  onChange: (layout: ColumnLayout<Id>) => void;
  canReset: boolean;
  onReset: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const columnOf = (id: Id) => columns.find((c) => c.id === id);
  const shown = layout.order.filter((id) => layout.visible[id]);
  const hidden = layout.order.filter((id) => !layout.visible[id]);
  const query = search.trim().toLowerCase();
  const addable = hidden.filter((id) => !query || columnOf(id)?.label.toLowerCase().includes(query));

  const onOpenChange = (open: boolean) => {
    if (!open) return;
    setAdding(false);
    setSearch("");
  };

  // Hidden columns keep their place after the shown ones, so showing one again puts it last.
  const reorder = (ids: Id[]) => onChange({ ...layout, order: [...ids, ...hidden] });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= shown.length || from === to) return;
    const ids = [...shown];
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorder(ids);
  };

  const remove = (id: Id) => onChange({ ...layout, visible: { ...layout.visible, [id]: false } });

  const add = (id: Id) =>
    onChange({
      order: [...shown, id, ...hidden.filter((h) => h !== id)],
      visible: { ...layout.visible, [id]: true },
    });

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger className={toolbarButton()}>
        <Settings2 />
        Kolom
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="isolate z-50" sideOffset={4} align="start" collisionPadding={8}>
          <Popover.Popup className={cn(panelPopup, "flex max-h-(--available-height) w-64 flex-col")}>
            {adding ? (
              <>
                <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setSearch("");
                    }}
                    aria-label="Kembali"
                    className="-ml-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari kolom"
                    aria-label="Cari kolom"
                    className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
                  />
                </div>
                <div className="max-h-72 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                  {addable.length === 0 ? (
                    <p className="px-2.5 py-2 text-sm text-muted-foreground">
                      {hidden.length === 0 ? "Semua kolom sudah tampil." : "Tidak ada kolom yang cocok."}
                    </p>
                  ) : (
                    addable.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => add(id)}
                        className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        {columnOf(id)?.label}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="max-h-72 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5">
                  {shown.map((id, index) => {
                    const column = columnOf(id);
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={(e) => {
                          setDragIndex(index);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setOverIndex(index);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIndex !== null) move(dragIndex, index);
                          endDrag();
                        }}
                        onDragEnd={endDrag}
                        className={cn(
                          "group mx-1.5 flex cursor-grab items-center gap-2 rounded-md px-3 py-1.5 transition-colors select-none hover:bg-accent active:cursor-grabbing",
                          overIndex === index && dragIndex !== index && "bg-primary/5",
                          dragIndex === index && "opacity-40",
                        )}
                      >
                        <GripHorizontal className="hidden size-4 shrink-0 text-muted-foreground pointer-fine:block" />
                        <span className="flex shrink-0 flex-col pointer-fine:hidden">
                          <button
                            type="button"
                            onClick={() => move(index, index - 1)}
                            disabled={index === 0}
                            aria-label={`Geser ${column?.label} ke kiri`}
                            className="rounded p-0.5 text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, index + 1)}
                            disabled={index === shown.length - 1}
                            aria-label={`Geser ${column?.label} ke kanan`}
                            className="rounded p-0.5 text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </span>
                        <span className="flex-1 truncate text-sm">{column?.label}</span>
                        {column?.required ? (
                          <span className="size-5 shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => remove(id)}
                            aria-label={`Sembunyikan ${column?.label}`}
                            className="grid size-5 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground/40 transition-colors group-hover:text-muted-foreground hover:bg-destructive/10 hover:text-destructive! pointer-coarse:text-muted-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="shrink-0 border-t py-1">
                  <button type="button" onClick={() => setAdding(true)} className={footerButton}>
                    <Plus />
                    Tambah kolom
                  </button>
                  {canReset && (
                    <button type="button" onClick={onReset} className={footerButton}>
                      <RotateCcw />
                      Kembalikan ke default
                    </button>
                  )}
                </div>
              </>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
