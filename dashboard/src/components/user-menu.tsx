"use client";

import { Menu } from "@base-ui/react/menu";
import { ArrowUpRight, CircleUserRound, Globe, LifeBuoy, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

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

const APP_VERSION = "v0.1.0";

const itemClass =
  "flex w-full cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground/85 outline-none select-none data-highlighted:bg-accent data-highlighted:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

function Avatar({ user, size = "sm" }: { user: CurrentUser; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center bg-foreground font-semibold text-background",
        size === "sm" ? "size-6 rounded-md text-[10px]" : "size-11 rounded-xl text-sm",
      )}
    >
      {initialsOf(user.name)}
    </span>
  );
}

/** The signed-in user at the foot of the sidebar; `labelClassName` lets the sidebar fade the name when it collapses. */
export function UserMenu({ user, labelClassName }: { user: CurrentUser; labelClassName?: string }) {
  const router = useRouter();

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Menu akun"
        className="flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-lg px-0.5 text-left text-sm whitespace-nowrap text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-sidebar-accent"
      >
        <Avatar user={user} />
        <span className={cn("truncate", labelClassName)}>{user.name}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8} className="z-50">
          <Menu.Popup className="w-72 origin-(--transform-origin) rounded-2xl bg-popover p-2 text-popover-foreground shadow-[0_12px_32px_rgb(0_0_0/0.1),0_0_0_1px_var(--border)] transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
              <Avatar user={user} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Menu.Separator className="mx-2.5 my-1 h-px bg-border" />
            <Menu.Item className={itemClass}>
              <CircleUserRound /> Informasi profil
            </Menu.Item>
            <Menu.Item className={itemClass}>
              <ShieldCheck /> Akun & keamanan
            </Menu.Item>
            <Menu.Item className={itemClass}>
              <Settings /> Pengaturan
            </Menu.Item>

            <Menu.Separator className="mx-2.5 my-1 h-px bg-border" />
            <Menu.Item className={itemClass}>
              <LifeBuoy /> Bantuan
              <ArrowUpRight className="ml-auto" />
            </Menu.Item>
            <Menu.LinkItem className={itemClass} href="https://www.jasaraharja.co.id" target="_blank" rel="noreferrer">
              <Globe /> Portal Jasa Raharja
              <ArrowUpRight className="ml-auto" />
            </Menu.LinkItem>

            <Menu.Separator className="mx-2.5 my-1 h-px bg-border" />
            <Menu.Item className={itemClass} onClick={signOut}>
              <LogOut /> Sign out
            </Menu.Item>
            <p className="px-2.5 pt-2 pb-1 text-xs text-muted-foreground">{APP_VERSION}</p>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
