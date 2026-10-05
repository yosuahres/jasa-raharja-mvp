"use client";

import { Menu } from "@base-ui/react/menu";
import { ArrowUpRight, Globe, LogOut, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { notifyError } from "@/lib/action-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type CurrentUser = { name: string; email: string };

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const itemClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none select-none transition-colors data-highlighted:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

function Avatar({ user, size = "sm" }: { user: CurrentUser; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-sm bg-sidebar-primary font-semibold text-sidebar-primary-foreground",
        size === "sm" ? "size-6 text-[10px]" : "size-10 text-sm",
      )}
    >
      {initialsOf(user.name)}
    </span>
  );
}

/** The signed-in user at the foot of the sidebar; `labelClassName` lets the sidebar fade the name when it collapses. */
export function UserMenu({ user, labelClassName }: { user: CurrentUser; labelClassName?: string }) {
  const router = useRouter();
  const [themeOpen, setThemeOpen] = useState(false);

  const signOut = async () => {
    const { error } = await createClient().auth.signOut();
    if (error) {
      notifyError("action", error.message);
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Menu akun"
          className="flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-md px-0.5 text-left text-sm font-medium whitespace-nowrap text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-sidebar-accent"
        >
          <Avatar user={user} />
          <span className={cn("truncate", labelClassName)}>{user.name}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" align="start" sideOffset={8} className="z-50">
            <Menu.Popup className="w-60 origin-(--transform-origin) overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <div className="flex items-center gap-3 border-b p-3">
                <Avatar user={user} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="p-1">
                <Menu.Item className={itemClass} onClick={() => setThemeOpen(true)}>
                  <Palette /> Ganti tema
                </Menu.Item>
                <Menu.LinkItem className={itemClass} href="https://www.jasaraharja.co.id" target="_blank" rel="noreferrer">
                  <Globe /> Portal Jasa Raharja
                  <ArrowUpRight className="ml-auto" />
                </Menu.LinkItem>
              </div>

              <Menu.Separator className="mx-2 h-px bg-border" />
              <div className="p-1">
                <Menu.Item className={cn(itemClass, "text-primary [&_svg]:text-primary")} onClick={signOut}>
                  <LogOut /> Keluar
                </Menu.Item>
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <ThemeSwitcher open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  );
}
