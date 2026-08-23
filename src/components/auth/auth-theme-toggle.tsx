"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type AuthThemeToggleProps = {
  className?: string;
};

export function AuthThemeToggle({ className }: AuthThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 shadow-sm backdrop-blur-md",
        "hover:bg-accent/80 disabled:opacity-60",
        className,
      )}
      onClick={() => {
        if (!mounted) return;
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }}
      aria-label="Toggle theme"
      disabled={!mounted}
    >
      {!mounted ? (
        <span className="size-4" aria-hidden />
      ) : resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
