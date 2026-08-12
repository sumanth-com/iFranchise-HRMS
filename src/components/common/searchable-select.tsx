"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  noneLabel?: string;
  allowNone?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
};

/** Type-to-filter select with optional None. Works inside dialogs. */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Search or select…",
  noneLabel = "None",
  allowNone = true,
  disabled = false,
  emptyMessage = "No matches",
}: SearchableSelectProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectValue(next: string | null) {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex h-9 w-full items-center gap-1 rounded-md border border-input bg-transparent px-2 shadow-xs",
          disabled && "cursor-not-allowed opacity-60",
          open && "ring-1 ring-ring",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          placeholder={selected?.label ?? placeholder}
          value={open ? query : selected?.label ?? ""}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {value && allowNone && !disabled ? (
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear selection"
            onClick={(event) => {
              event.preventDefault();
              selectValue(null);
            }}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Toggle options"
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
        >
          <ChevronsUpDown className="size-3.5" />
        </button>
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {allowNone ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent",
                  !value && "bg-accent",
                )}
                onClick={() => selectValue(null)}
              >
                <Check className={cn("size-3.5", value ? "opacity-0" : "opacity-100")} />
                <span className="text-muted-foreground">{noneLabel}</span>
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">{emptyMessage}</li>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                    onClick={() => selectValue(option.value)}
                  >
                    <Check className={cn("size-3.5", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{option.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
