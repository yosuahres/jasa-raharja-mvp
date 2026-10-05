"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

// A manual choice lives on <html data-theme> (applied before paint by the root layout); without one
// the page follows the system.
const readTheme = (): Theme => {
  const chosen = document.documentElement.dataset.theme;
  return chosen === "light" || chosen === "dark" ? chosen : "system";
};

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this visit.
  }
};

function LightPreview() {
  return (
    <div className="flex size-full flex-col gap-1.5 bg-[#f5f6f8] p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <span className="h-1.5 w-4 rounded-full bg-neutral-300" />
          <span className="h-1.5 w-2 rounded-full bg-neutral-300" />
        </div>
        <span className="size-2.5 rounded-full bg-neutral-700" />
      </div>
      <div className="mt-1 flex flex-1 flex-col gap-1 rounded-md bg-white p-1.5 shadow-sm">
        <span className="h-1 w-3/4 rounded-full bg-neutral-200" />
        <span className="h-1 w-1/2 rounded-full bg-neutral-200" />
      </div>
    </div>
  );
}

function DarkPreview() {
  return (
    <div className="flex size-full flex-col gap-1.5 bg-[#1c1c1e] p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <span className="h-1.5 w-4 rounded-full bg-neutral-600" />
          <span className="h-1.5 w-2 rounded-full bg-neutral-600" />
        </div>
        <span className="size-2.5 rounded-full bg-neutral-200" />
      </div>
      <div className="mt-1 flex flex-1 flex-col gap-1 rounded-md bg-[#2a2a2d] p-1.5">
        <span className="h-1 w-3/4 rounded-full bg-neutral-700" />
        <span className="h-1 w-1/2 rounded-full bg-neutral-700" />
      </div>
    </div>
  );
}

function SystemPreview() {
  return (
    <div className="flex size-full">
      <div className="flex h-full w-1/2 flex-col gap-1 bg-[#f5f6f8] p-2">
        <span className="h-1.5 w-4 rounded-full bg-neutral-300" />
        <div className="mt-0.5 flex-1 rounded-md bg-white shadow-sm" />
      </div>
      <div className="flex h-full w-1/2 flex-col items-end gap-1 bg-[#1c1c1e] p-2">
        <span className="h-1.5 w-4 rounded-full bg-neutral-600" />
        <div className="mt-0.5 w-full flex-1 rounded-md bg-[#2a2a2d]" />
      </div>
    </div>
  );
}

const OPTIONS: { value: Theme; label: string; preview: React.ReactNode }[] = [
  { value: "light", label: "Terang", preview: <LightPreview /> },
  { value: "dark", label: "Gelap", preview: <DarkPreview /> },
  { value: "system", label: "Sistem", preview: <SystemPreview /> },
];

/** Picks light, dark, or following the system, each shown as a small preview of the shell. */
export function ThemeSwitcher({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const current = useSyncExternalStore(subscribe, readTheme, () => null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[480px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border bg-background p-6 shadow-2xl transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">Ganti tema</Dialog.Title>
            <Dialog.Close
              aria-label="Tutup"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {OPTIONS.map((option) => {
              const selected = current === option.value;
              return (
                <button
                  key={option.value}
                  aria-pressed={selected}
                  onClick={() => {
                    applyTheme(option.value);
                    onOpenChange(false);
                  }}
                  className="group flex flex-col items-center gap-2.5"
                >
                  <div
                    className={cn(
                      "aspect-4/3 w-full overflow-hidden rounded-lg border-2 transition-colors",
                      selected ? "border-primary ring-2 ring-primary/20" : "border-border group-hover:border-muted-foreground/40",
                    )}
                  >
                    {option.preview}
                  </div>
                  <span className={cn("flex items-center gap-1.5 text-sm font-medium", selected ? "text-primary" : "text-foreground")}>
                    {option.label}
                    {selected && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
