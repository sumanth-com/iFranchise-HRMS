import type { ActivePortal } from "@/providers/active-portal-provider";

export type TourStatus = "not_started" | "in_progress" | "skipped" | "completed";

export type TourStepPlacement = "top" | "bottom" | "left" | "right" | "auto";

export type TourStepDefinition = {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the highlighted element. Omit for centered steps. */
  target?: string;
  placement?: TourStepPlacement;
  /** Require any of these permissions (omit when open to all). */
  permissions?: string[];
  /** Require any of these role codes. */
  roles?: string[];
};

export type TourDefinition = {
  id: string;
  portal: ActivePortal;
  title: string;
  /** Exact path or prefix used for auto-start matching. */
  routeMatch: string;
  /** Match route prefix instead of exact path. */
  routePrefix?: boolean;
  autoStart?: boolean;
  /** Require any of these permissions for the whole tour. */
  permissions?: string[];
  steps: TourStepDefinition[];
};

export type TourStateRecord = {
  status: TourStatus;
  updatedAt: string;
};

export type UserTourStateMap = Record<string, TourStateRecord>;

export type ResolvedTourStep = TourStepDefinition & {
  index: number;
};

export type ActiveTourSession = {
  definition: TourDefinition;
  steps: ResolvedTourStep[];
  currentIndex: number;
};
