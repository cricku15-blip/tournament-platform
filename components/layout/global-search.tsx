"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function GlobalSearch({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-44 md:w-60 items-center justify-between rounded-pill border border-line bg-card px-3 text-xs text-muted transition-colors hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-primary select-none",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Search tournaments, teams...</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono text-muted">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="flex items-center border-b border-line px-4 py-3 gap-3">
            <Search className="h-5 w-5 text-muted shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tournaments, teams, or players..."
              className="w-full bg-transparent text-base text-ink placeholder:text-muted outline-none"
              autoFocus
            />
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {query.trim().length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                Type a name to search across tournaments, teams, and player profiles.
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted">
                Live search will be connected in Plan 4.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
