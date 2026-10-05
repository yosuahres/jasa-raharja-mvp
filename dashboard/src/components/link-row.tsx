"use client";

import { useRouter } from "next/navigation";

import { TableRow } from "@/components/ui/table";

/**
 * A table row that opens `href` when clicked anywhere. A link stretched over the row can't do this:
 * browsers don't reliably position against a <tr>, so every row's link ends up covering the whole table.
 * The row should still hold a real link to `href` for keyboard users and opening in a new tab.
 */
export function LinkRow({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();

  const onClick = (event: React.MouseEvent) => {
    // Links, checkboxes and buttons in the row do their own thing.
    if (event.target instanceof Element && event.target.closest("a, button, input, label")) return;
    // Selecting text in the row isn't a click on it.
    if (window.getSelection()?.toString()) return;
    router.push(href);
  };

  return (
    <TableRow className={className} onClick={onClick} onMouseEnter={() => router.prefetch(href)}>
      {children}
    </TableRow>
  );
}
