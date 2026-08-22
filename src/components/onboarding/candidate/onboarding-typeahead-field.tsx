"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type OnboardingTypeaheadFieldProps = {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  suggestions: string[];
  onValueChange: (value: string) => void;
  onSelect?: (value: string) => void;
  inputClassName?: string;
  minChars?: number;
};

export function OnboardingTypeaheadField({
  label,
  required = false,
  value,
  placeholder,
  disabled = false,
  suggestions,
  onValueChange,
  onSelect,
  inputClassName,
  minChars = 1,
}: OnboardingTypeaheadFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const showSuggestions =
    open && !disabled && value.trim().length >= minChars && suggestions.length > 0;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative space-y-1">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-foreground"> *</span> : null}
      </Label>
      <Input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listId : undefined}
        className={inputClassName}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
      />
      {showSuggestions ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover py-1 shadow-md"
        >
          {suggestions.map((item) => (
            <li key={item}>
              <button
                type="button"
                role="option"
                className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onValueChange(item);
                  onSelect?.(item);
                  setOpen(false);
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
