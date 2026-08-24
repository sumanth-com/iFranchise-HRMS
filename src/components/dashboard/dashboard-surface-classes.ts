/** Dashboard card shells — borderless soft lift in light mode; dark mode unchanged. */
export const dashboardSectionClass =
  "dashboard-surface rounded-xl border-0 bg-card p-3 md:p-4 dark:border-0 dark:shadow-none";

export const dashboardNestedPanelClass =
  "dashboard-surface rounded-xl border-0 bg-card p-3 dark:border-0 dark:bg-white/[0.03] dark:shadow-none";

export const dashboardTileClass =
  "dashboard-surface rounded-xl border-0 bg-card p-3 outline-none transition-[box-shadow,background-color] focus-visible:ring-2 focus-visible:ring-ring/40 dark:border-0 dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.07]";

export const dashboardMetricClass =
  "dashboard-surface flex h-full min-h-[4.25rem] flex-col justify-between rounded-lg border-0 bg-card px-2.5 py-2.5 transition-[box-shadow,background-color] dark:border-0 dark:bg-white/[0.045] dark:shadow-none dark:hover:bg-white/[0.08]";

export const dashboardInsetTileClass =
  "dashboard-surface flex min-h-0 flex-col items-center justify-center rounded-lg border-0 bg-card px-2.5 py-3 text-center outline-none transition-[box-shadow,background-color] dark:border-0 dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.07]";

export const dashboardEmptyStateClass =
  "dashboard-surface flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border-0 border-dashed bg-muted/15 px-3 py-6 text-center dark:border-0 dark:bg-white/[0.02] dark:shadow-none";

export const dashboardGradientTileClass =
  "dashboard-surface group relative overflow-hidden rounded-xl border-0 bg-gradient-to-br p-3 transition-[box-shadow,background-color] dark:border-0 dark:shadow-none";
