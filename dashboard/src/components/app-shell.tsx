"use client";

import {
  Building2,
  FileUp,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type CurrentUser, UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other routes that belong to this item, e.g. the edit pages behind Input Data. */
  also?: string[];
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rekomendasi", label: "Cari Rujukan", icon: Route },
  { href: "/rumah-sakit", label: "Rumah Sakit", icon: Building2 },
];


const isActive = (pathname: string, { href, also = [] }: NavItem) =>
  href === "/" ? pathname === "/" : [href, ...also].some((prefix) => pathname.startsWith(prefix));

const titleOf = (pathname: string) =>
  pathname.startsWith("/input") ? "Upload dokumen" : (NAV.find((item) => isActive(pathname, item))?.label ?? "");

// The collapsed state lives on <html data-sidebar> (set before paint in the root layout) so CSS can style it without a flash.
const readCollapsed = () =>
  document.documentElement.dataset.sidebar === "collapsed";

const subscribeCollapsed = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-sidebar"],
  });
  return () => observer.disconnect();
};

const setCollapsed = (collapsed: boolean) => {
  if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
  try {
    localStorage.setItem("sidebar", collapsed ? "collapsed" : "expanded");
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this visit.
  }
};

const useSidebarCollapsed = () =>
  useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

const LOGO = "/databiota-logo.png";
const LOGO_HEIGHT = 22;

// Fades labels out as the sidebar narrows, in step with the width transition.
const FADE =
  "transition-opacity duration-200 ease-out motion-reduce:transition-none sidebar-collapsed:opacity-0";

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const collapsed = useSidebarCollapsed();

  return (
    <div className="flex min-h-screen bg-shell">
      <aside className="sticky top-0 hidden h-screen w-50 shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block sidebar-collapsed:w-11">
        <Sidebar pathname={pathname} user={user} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Tutup menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] bg-shell shadow-xl">
            <button
              aria-label="Tutup menu"
              className="absolute top-5 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
            <Sidebar pathname={pathname} user={user} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="flex min-h-0 flex-1 flex-col bg-background lg:rounded-xl lg:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_0_0_1px_var(--border)]">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <button
              aria-label="Buka menu"
              className="-ml-1.5 rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <button
              aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              aria-expanded={!collapsed}
              className="-ml-1 hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:block"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
            <h1 className="truncate text-sm text-foreground">{titleOf(pathname)}</h1>
            <div className="ml-auto flex items-center gap-3">
              {/* The dashboard stays a read-only overview; uploading starts from the other pages. */}
              {pathname !== "/" && (
                <Link href="/input" className={cn(buttonVariants({ variant: "outline", size: "sm" }), pathname === "/input" && "bg-muted")}>
                  <FileUp />
                  <span className="max-sm:sr-only">Upload dokumen</span>
                </Link>
              )}
              <ThemeToggle />
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
        </div>
      </div>
    </div>
  );
}

// Nothing inside changes layout when collapsing: every item keeps its left offset and the narrowing
// aside clips it, so only the width animates. Container + item padding (8px + 6px) centers the 16px
// icons in the 44px collapsed rail.
function Sidebar({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string;
  user: CurrentUser;
  onNavigate?: () => void;
}) {
  const collapsed = useSidebarCollapsed();

  // The page under a clicked item can take a moment to load, so the item lights up on the click
  // and lets the URL take over once it arrives.
  const [clicked, setClicked] = useState<string | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setClicked(null);
  }
  const isCurrent = (item: NavItem) => (clicked ? item.href === clicked : isActive(pathname, item));

  const onItemClick = (href: string) => (event: React.MouseEvent) => {
    // A modified click opens a new tab and leaves this page where it is.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    setClicked(href);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col overflow-x-hidden overflow-y-auto px-2 py-4">
      <Link href="/" onClick={onNavigate} aria-label="Databiota" className="mt-2 flex items-center gap-1 pl-0.5">
        {/* The logo PNG is white-only, so it's used as a mask and filled with the theme's foreground color.
            Its artwork touches the image's edges, so the dot mark and the wordmark each get a 1px margin
            to keep rounding from shaving them. Collapsed, only the mark stays, centred in the rail. */}
        <span
          aria-hidden
          className="block size-6 shrink-0 bg-sidebar-foreground"
          style={{ mask: `url(${LOGO}) 1px center / auto ${LOGO_HEIGHT}px no-repeat` }}
        />
        <span
          aria-hidden
          className={cn("block h-6 w-[118px] shrink-0 bg-sidebar-foreground", FADE)}
          style={{ mask: `url(${LOGO}) right 1px center / auto ${LOGO_HEIGHT}px no-repeat` }}
        />
      </Link>

      <nav className="mt-6 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          return (
            <Tooltip key={href} disabled={!collapsed}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    onClick={onItemClick(href)}
                    aria-current={isCurrent(item) ? "page" : undefined}
                    className="group flex h-7 items-center gap-2.5 overflow-hidden rounded-lg px-1.5 text-sm whitespace-nowrap text-sidebar-foreground transition-colors hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground"
                  />
                }
              >
                {/* Icons sit dimmed behind the labels and come up to full strength on hover and on the current page. */}
                <Icon className="size-4 shrink-0 opacity-55 transition-opacity group-hover:opacity-100 group-active:opacity-100 group-aria-[current=page]:opacity-100" />
                <span className={FADE}>{label}</span>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <UserMenu user={user} labelClassName={FADE} />
      </div>
    </div>
  );
}
