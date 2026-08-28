"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { cn } from "@/lib/utils";
import type { CeoProvisioningUser } from "@/types/ceo-user-provisioning";

type CeoProvisioningUserSearchProps = {
  value: string;
  disabled?: boolean;
  className?: string;
  onChange: (search: string | undefined) => void;
  onFetchSuggestions: (query: string) => Promise<CeoProvisioningUser[]>;
};

export function CeoProvisioningUserSearch({
  value,
  disabled,
  className,
  onChange,
  onFetchSuggestions,
}: CeoProvisioningUserSearchProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CeoProvisioningUser[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    const suggestionTimer = window.setTimeout(async () => {
      setIsFetching(true);
      try {
        const results = await onFetchSuggestions(trimmed);
        if (!cancelled) setSuggestions(results);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(suggestionTimer);
    };
  }, [inputValue, onFetchSuggestions]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed === value.trim()) return;

    const filterTimer = window.setTimeout(() => {
      onChange(trimmed ? trimmed : undefined);
    }, 300);

    return () => window.clearTimeout(filterTimer);
  }, [inputValue, onChange, value]);

  const showSuggestions =
    open && !disabled && inputValue.trim().length >= 1 && suggestions.length > 0;

  function selectUser(user: CeoProvisioningUser) {
    const next = user.fullName;
    setInputValue(next);
    setOpen(false);
    onChange(next);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={inputValue}
        disabled={disabled}
        placeholder="Search people…"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listId : undefined}
        className="h-9 bg-background pl-9 pr-9"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setInputValue(event.target.value);
          setOpen(true);
        }}
      />
      {inputValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground"
          aria-label="Clear search"
          disabled={disabled}
          onClick={() => {
            setInputValue("");
            setOpen(false);
            onChange(undefined);
          }}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
      {showSuggestions ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          {suggestions.map((user) => (
            <li key={user.employeeId}>
              <button
                type="button"
                role="option"
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectUser(user)}
              >
                <span className="text-sm font-medium">{user.fullName}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && isFetching && inputValue.trim().length >= 1 ? (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Searching…
        </p>
      ) : null}
    </div>
  );
}
