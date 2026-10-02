"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const readTheme = (): Theme => {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
};

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
};

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this visit.
  }
};

const OPTIONS = [
  { value: "light", label: "Mode terang", icon: Sun },
  { value: "dark", label: "Mode gelap", icon: Moon },
] as const;

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);

  return (
    <div className="flex items-center rounded-lg bg-muted p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => applyTheme(value)}
          className={cn(
            "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
            theme === value && "bg-background text-foreground shadow-sm",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
