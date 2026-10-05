"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Menu } from "@base-ui/react/menu";
import { Columns3, MoreHorizontal, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useMemo, useState, useTransition } from "react";

import { deleteHospitals } from "@/app/(dashboard)/rumah-sakit/actions";
import { menuItem, menuPopup } from "@/components/data-table/styles";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/action-toast";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 3;

type CompareSelection = {
  selected: string[];
  toggle: (id: string) => void;
  set: (ids: string[]) => void;
};

const CompareContext = createContext<CompareSelection | null>(null);

const useCompareSelection = () => {
  const context = use(CompareContext);
  if (!context) throw new Error("CompareCheckbox must be rendered inside CompareSelectionProvider");
  return context;
};

/**
 * Holds which hospitals are ticked. Selection is client state so it survives the URL-driven filter
 * changes on the list. Render SelectionBar inside it to act on the ticked rows.
 */
export function CompareSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }, []);
  const value = useMemo(() => ({ selected, toggle, set: setSelected }), [selected, toggle]);

  return <CompareContext value={value}>{children}</CompareContext>;
}

export function CompareCheckbox({ id, name }: { id: string; name: string }) {
  const { selected, toggle } = useCompareSelection();

  return (
    // The row opens the detail page when clicked, but not through this label.
    // The padding widens the hit area around the small native checkbox.
    <label className="-m-2 grid size-8 cursor-pointer place-items-center rounded-md hover:bg-muted">
      <input
        type="checkbox"
        checked={selected.includes(id)}
        onChange={() => toggle(id)}
        aria-label={`Pilih ${name}`}
        className="size-4 cursor-[inherit] rounded accent-foreground"
      />
    </label>
  );
}

/**
 * The pill above the pager while rows are ticked, as in the CRM tables: how many, a menu of what to do
 * with them (Bandingkan, Hapus), Pilih semua, and ×. `visibleIds` are the rows the list shows now.
 */
export function SelectionBar({ visibleIds }: { visibleIds: string[] }) {
  const { selected, set } = useCompareSelection();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  if (selected.length === 0) return null;

  const canCompare = selected.length >= 2 && selected.length <= MAX_COMPARE;

  const remove = () =>
    startDelete(async () => {
      const { error } = await deleteHospitals(selected);
      if (error) {
        notifyError("delete", error);
        return;
      }
      notifySuccess("deleted", `${selected.length} rumah sakit`);
      setConfirmDelete(false);
      set([]);
      router.refresh();
    });

  return (
    <>
      {/* A zero-height anchor between the rows and the pager: the pill floats just above the pager. */}
      <div className="relative z-20 h-0">
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background px-4 py-2 shadow-lg">
          <input
            type="checkbox"
            checked
            readOnly
            tabIndex={-1}
            className="pointer-events-none size-4 rounded accent-foreground"
          />
          <span className="text-sm font-medium whitespace-nowrap">{selected.length} dipilih</span>
          <Menu.Root modal={false}>
            <Menu.Trigger
              aria-label="Opsi"
              className="flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted"
            >
              <MoreHorizontal className="size-4" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner className="isolate z-50 outline-none" side="top" align="center" sideOffset={8}>
                <Menu.Popup className={menuPopup}>
                  <Menu.Item
                    className={cn(menuItem, "data-disabled:cursor-not-allowed data-disabled:opacity-50")}
                    disabled={!canCompare}
                    onClick={() => router.push(`/bandingkan?rs=${selected.join(",")}`)}
                  >
                    <Columns3 className="text-muted-foreground" />
                    Bandingkan
                  </Menu.Item>
                  <Menu.Item
                    className={cn(
                      menuItem,
                      "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive",
                    )}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 />
                    Hapus
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            type="button"
            className="cursor-pointer text-sm whitespace-nowrap hover:underline"
            onClick={() => set(visibleIds)}
          >
            Pilih semua
          </button>
          <button
            type="button"
            aria-label="Batalkan pilihan"
            className="flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted"
            onClick={() => set([])}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <AlertDialog.Root open={confirmDelete} onOpenChange={(open) => !deleting && setConfirmDelete(open)}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <AlertDialog.Title className="font-medium">Hapus {selected.length} rumah sakit?</AlertDialog.Title>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Close render={<Button variant="outline" disabled={deleting} />}>Batal</AlertDialog.Close>
              <Button variant="destructive" onClick={remove} disabled={deleting}>
                {deleting ? "Menghapus…" : "Hapus"}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
