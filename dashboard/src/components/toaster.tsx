"use client";

import { Toaster as HotToaster } from "react-hot-toast";

/** Where action toasts appear; styled with the theme's popover colors so they follow light and dark. */
export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        className: "bg-popover! text-popover-foreground! text-sm! rounded-xl! shadow-[0_12px_32px_rgb(0_0_0/0.1),0_0_0_1px_var(--border)]!",
      }}
    />
  );
}
