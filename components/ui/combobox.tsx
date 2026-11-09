"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  error = false,
  className,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  const filteredOptions = React.useMemo(() => {
    if (!query) return options;
    const lower = query.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        (opt.hint && opt.hint.toLowerCase().includes(lower))
    );
  }, [options, query]);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredOptions[highlightedIndex];
      if (current) {
        onChange?.(current.value);
        setOpen(false);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-input border border-line bg-card px-3.5 py-2 text-base text-ink placeholder:text-muted/70 transition-colors text-left",
            "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-45",
            error && "border-danger focus-visible:outline-danger",
            className
          )}
        >
          <span className={cn(!selectedOption && "text-muted")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[200px] rounded-input border border-line bg-card p-1 text-ink shadow-md outline-none"
        >
          <div className="flex items-center border-b border-line px-2.5 py-1.5 gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = option.value === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange?.(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "relative flex w-full cursor-pointer items-center justify-between rounded-sm px-2.5 py-2 text-sm text-left transition-colors",
                      isHighlighted && "bg-surface text-ink",
                      isSelected && "font-semibold text-primary"
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.hint && (
                        <span className="text-xs text-muted">
                          {option.hint}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
