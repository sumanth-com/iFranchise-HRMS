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

/**
 * Shared home-dashboard layout (CEO / Super Admin / Employee / HR self-service /
 * Manager self-service / Accountant self-service).
 * Responsive only — no fixed viewport heights, no fixed rem column mins.
 */
export const DASHBOARD_HOME_SHELL =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5";

export const DASHBOARD_HOME_INNER =
  "mx-auto flex w-full min-w-0 max-w-[88rem] flex-1 flex-col gap-3";

export const DASHBOARD_HOME_BAND = "w-full min-w-0 shrink-0";

/** KPI row — equal-height cards across portals. */
export const DASHBOARD_KPI_GRID =
  "grid w-full min-w-0 grid-cols-2 items-stretch gap-3 xl:grid-cols-4";

/**
 * Main two-column band: left stack | Celebrations.
 * Both columns use minmax(0, fr) so zoom never forces horizontal overflow.
 */
export const DASHBOARD_HOME_MAIN_GRID =
  "grid w-full min-w-0 flex-1 gap-3 max-lg:flex-none lg:min-h-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch";

export const DASHBOARD_HOME_LEFT_STACK =
  "flex min-h-0 min-w-0 flex-col gap-3 lg:h-full";

/** Quote / daily boost — fills remaining left column; scrolls with page at high zoom. */
export const DASHBOARD_HOME_BOOST =
  "min-h-0 w-full min-w-0 flex-1 basis-0 max-lg:min-h-[11rem] max-lg:flex-none";

/** Celebrations / Team Updates / Announcements — stretch with left column. */
export const DASHBOARD_HOME_EVENTS =
  "min-h-0 w-full min-w-0 max-lg:min-h-[16rem] max-lg:flex-none lg:h-full lg:min-h-0";
