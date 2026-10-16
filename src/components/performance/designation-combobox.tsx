"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/common/input";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/types/employee";

type DesignationComboboxProps = {
  designations: LookupOption[];
  valueId: string;
  valueLabel: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (next: { id: string; label: string; isNew: boolean }) => void;
};

export function DesignationCombobox({
  designations,
  valueId,
  valueLabel,
  disabled = false,
  placeholder = "Search or type a designation",
  onChange,
}: DesignationComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(valueLabel);

  useEffect(() => {
    setQuery(valueLabel);
  }, [valueLabel, valueId]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return designations.slice(0, 12);
    return designations
      .filter((row) => row.label.toLowerCase().includes(normalizedQuery))
      .slice(0, 12);
  }, [designations, normalizedQuery]);

  const exactMatch = designations.find(
    (row) => row.label.trim().toLowerCase() === normalizedQuery,
  );
  const showCreate =
    normalizedQuery.length > 0 &&
    !exactMatch &&
    !filtered.some((row) => row.label.trim().toLowerCase() === normalizedQuery);

  function commitTypedValue(raw: string) {
    const title = raw.trim();
    if (!title) {
      onChange({ id: "", label: "", isNew: false });
      return;
    }
    const match = designations.find(
      (row) => row.label.trim().toLowerCase() === title.toLowerCase(),
    );
    if (match) {
      onChange({ id: match.id, label: match.label, isNew: false });
      setQuery(match.label);
      return;
    }
    onChange({ id: "", label: title, isNew: true });
    setQuery(title);
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setOpen(true);
          const match = designations.find(
            (row) => row.label.trim().toLowerCase() === next.trim().toLowerCase(),
          );
          if (match) {
            onChange({ id: match.id, label: match.label, isNew: false });
          } else {
            onChange({
              id: "",
              label: next,
              isNew: next.trim().length > 0,
            });
          }
        }}
        onBlur={() => commitTypedValue(query)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTypedValue(query);
            setOpen(false);
          }
        }}
      />
      {open && !disabled && (filtered.length > 0 || showCreate) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover py-1 shadow-md"
        >
          {filtered.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                role="option"
                aria-selected={row.id === valueId}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-muted",
                  row.id === valueId && "bg-muted font-medium",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ id: row.id, label: row.label, isNew: false });
                  setQuery(row.label);
                  setOpen(false);
                }}
              >
                {row.label}
              </button>
            </li>
          ))}
          {showCreate ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const title = query.trim();
                  onChange({ id: "", label: title, isNew: true });
                  setQuery(title);
                  setOpen(false);
                }}
              >
                Create “{query.trim()}”
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {valueLabel.trim() && !valueId ? (
        <p className="mt-1 text-xs text-muted-foreground">
          New designation will be saved when you confirm.
        </p>
      ) : null}
    </div>
  );
}
