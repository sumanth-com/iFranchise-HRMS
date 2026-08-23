"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type AuthThemeToggleProps = {
  className?: string;
};

export function AuthThemeToggle({ className }: AuthThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const isDark = ready && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "size-9 rounded-xl border-border/70 bg-background/80 shadow-sm backdrop-blur-md",
        "hover:bg-accent/80",
        className,
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={!ready}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
