/**
 * Shared card surfaces — same pattern as the self-service portal
 * (employee-module-primitives: solid border + white card + shadow-sm).
 */
export const cardSectionClass =
  "rounded-xl border bg-card p-4 shadow-sm";

export const cardSectionCompactClass =
  "rounded-xl border bg-card p-3 shadow-sm md:p-4";

export const cardTileClass =
  "rounded-xl border bg-card p-3.5 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-primary/40 hover:bg-accent/30 dark:hover:border-indigo-300/50 dark:hover:bg-transparent";

export const cardNestedClass =
  "rounded-xl border bg-card p-3 shadow-sm";

export const cardInsetClass =
  "rounded-lg border bg-card shadow-sm transition-[border-color,background-color] duration-150 hover:border-primary/40 hover:bg-accent/30 dark:hover:border-indigo-300/50 dark:hover:bg-transparent";

export const cardEmptyClass =
  "rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center";

export const cardGradientClass =
  "rounded-xl border bg-gradient-to-br p-3 shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-primary/30 dark:hover:border-indigo-300/40";
