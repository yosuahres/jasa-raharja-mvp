import { cn } from "@/lib/utils";

/**
 * A page that fills the space under the app header, as the CRM tables do: no title of its own (the
 * header names the page), a toolbar, then the content. The header is 3rem; on lg the shell adds 0.5rem
 * above and below its rounded panel.
 */
export const FULL_PAGE = "flex h-[calc(100dvh-3rem)] min-h-80 flex-col lg:h-[calc(100dvh-4rem)]";

/** The toolbar row along the top of a full page: search, filters, sort, settings. */
export const TOOLBAR = "flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2";

/** The outlined buttons in a table toolbar (Urutkan, Filter, Kolom). `active` when they hold a choice. */
export const toolbarButton = (active = false) =>
  cn(
    "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5 [&_svg]:shrink-0",
    active
      ? "border-primary/40 bg-primary/5 text-primary"
      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground data-popup-open:border-primary/40 data-popup-open:bg-primary/5 data-popup-open:text-primary",
  );

export const menuPopup =
  "min-w-48 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[scale,opacity] duration-100 outline-none data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0";

export const menuItem =
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0";

/** A panel that opens from a toolbar button: column settings, a filter's choices. */
export const panelPopup =
  "origin-(--transform-origin) overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg transition-[scale,opacity] duration-100 outline-none data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0";
