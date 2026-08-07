"use client";

import { Check, Circle, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type HiringStageVisualState = "completed" | "current" | "pending" | "rejected";

type HiringStageTrackItem = {
  id: string;
  label: string;
  hint?: string | null;
  state: HiringStageVisualState;
  isClickable: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
};

type HiringStageTrackProps = {
  items: HiringStageTrackItem[];
  className?: string;
};

function nodeClasses(state: HiringStageVisualState) {
  if (state === "completed") {
    return "border-emerald-500 bg-emerald-500 text-white";
  }
  if (state === "current") {
    return "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15";
  }
  if (state === "rejected") {
    return "border-destructive bg-destructive text-destructive-foreground";
  }
  return "border-background bg-muted text-muted-foreground ring-2 ring-border/80";
}

function hintClasses(state: HiringStageVisualState) {
  if (state === "completed") return "text-emerald-700/90";
  if (state === "current") return "text-primary";
  if (state === "rejected") return "text-destructive";
  return "text-muted-foreground/80";
}

function getProgressPercent(items: HiringStageTrackItem[]) {
  if (items.length <= 1) return 0;

  const lastCompleted = items.reduce(
    (max, item, index) => (item.state === "completed" ? index : max),
    -1,
  );
  const currentIndex = items.findIndex(
    (item) => item.state === "current" || item.state === "rejected",
  );

  let progressIndex = lastCompleted;
  if (currentIndex >= 0 && items[currentIndex].state === "current") {
    progressIndex = currentIndex;
  } else if (items.every((item) => item.state === "completed")) {
    progressIndex = items.length - 1;
  }

  return (progressIndex / (items.length - 1)) * 100;
}

export function HiringStageTrack({ items, className }: HiringStageTrackProps) {
  const progressPercent = getProgressPercent(items);
  const trackInset = "12%";

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="relative px-1 py-1">
        <div
          className="pointer-events-none absolute top-[26px] h-[2px] rounded-full bg-border/70"
          style={{ left: trackInset, right: trackInset }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-[26px] h-[2px] rounded-full bg-emerald-400 hiring-stage-connector-fill"
          style={{
            left: trackInset,
            width: `calc((100% - 24%) * ${progressPercent / 100})`,
          }}
          aria-hidden
        />

        <ol className="relative flex min-w-full items-start justify-between gap-0">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex w-[5rem] shrink-0 flex-col items-center sm:w-[5.5rem]"
            >
              <button
                type="button"
                disabled={!item.isClickable || item.disabled}
                onClick={item.onClick}
                title={item.title}
                className={cn(
                  "group flex w-full flex-col items-center rounded-lg px-0.5 py-1 transition-colors",
                  item.isClickable && !item.disabled && "cursor-pointer",
                  !item.isClickable && "cursor-default",
                  item.disabled && item.isClickable && "opacity-50",
                  item.state === "completed" &&
                    item.isClickable &&
                    "hover:[&_.hiring-stage-label]:text-emerald-700",
                  item.state === "pending" &&
                    item.isClickable &&
                    "hover:[&_.hiring-stage-label]:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "hiring-stage-node relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-transform",
                    nodeClasses(item.state),
                    item.state === "current" && "hiring-stage-node-current",
                    item.state === "completed" && "hiring-stage-node-completed",
                    item.isClickable && !item.disabled && "group-hover:scale-105",
                  )}
                >
                  {item.state === "completed" ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : item.state === "rejected" ? (
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : item.state === "current" ? (
                    index + 1
                  ) : (
                    <Circle className="h-3 w-3 opacity-50" />
                  )}
                </div>

                <div className="mt-2 flex w-full flex-col items-center gap-1 text-center">
                  <span
                    className={cn(
                      "hiring-stage-label w-full truncate text-[10px] font-semibold leading-tight transition-colors",
                      item.state === "pending" ? "text-muted-foreground" : "text-foreground",
                      item.state === "rejected" && "text-destructive",
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "flex h-[11px] w-full items-center justify-center px-0.5 text-[9px] font-medium leading-none",
                      item.hint ? hintClasses(item.state) : "text-transparent",
                    )}
                  >
                    <span className="truncate">{item.hint ?? "·"}</span>
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
