"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { setTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark";

function current(): Mode {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Day / Night switch. Remembers the choice in a cookie so the server renders the right theme next time. */
export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = React.useState<Mode | null>(null);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the effective theme is only known in the browser
    setMode(current());
  }, []);
  const next: Mode = mode === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
        setMode(next);
      }}
      aria-label={mode ? `Switch to ${next === "dark" ? "Night" : "Day"} theme` : "Switch theme"}
      title={mode ? `Switch to ${next === "dark" ? "Night" : "Day"}` : "Switch theme"}
      className={cn("relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card/70 text-muted backdrop-blur-sm transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-2", className)}
    >
      {mode === "dark" ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
