import { hasAnyPermission, hasAnyRole } from "@/lib/permissions/utils";
import type { Role } from "@/types/auth";
import type {
  TourDefinition,
  TourStatus,
  TourStepDefinition,
  UserTourStateMap,
} from "@/lib/product-tour/types";
import { PRODUCT_TOURS } from "@/lib/product-tour/tour-registry";

export function parseTourState(value: unknown): UserTourStateMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const map: UserTourStateMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const status = row.status;
    if (
      status !== "not_started" &&
      status !== "in_progress" &&
      status !== "skipped" &&
      status !== "completed"
    ) {
      continue;
    }
    map[key] = {
      status,
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    };
  }
  return map;
}

export function getTourStatus(
  tourState: UserTourStateMap,
  tourId: string,
): TourStatus {
  return tourState[tourId]?.status ?? "not_started";
}

export function shouldAutoStartTour(
  tourState: UserTourStateMap,
  tour: TourDefinition,
): boolean {
  if (!tour.autoStart) return false;
  const status = getTourStatus(tourState, tour.id);
  return status === "not_started";
}

export function routeMatchesTour(pathname: string, tour: TourDefinition): boolean {
  if (tour.routePrefix) {
    return pathname === tour.routeMatch || pathname.startsWith(`${tour.routeMatch}/`);
  }
  return pathname === tour.routeMatch;
}

export function filterTourSteps(
  steps: TourStepDefinition[],
  permissionCodes: string[],
  roles: Role[],
): TourStepDefinition[] {
  return steps.filter((step) => {
    if (step.permissions?.length && !hasAnyPermission(permissionCodes, step.permissions)) {
      return false;
    }
    if (step.roles?.length && !hasAnyRole(roles, step.roles)) {
      return false;
    }
    return true;
  });
}

export function findAutoStartTour(
  pathname: string,
  portal: TourDefinition["portal"],
  tourState: UserTourStateMap,
  permissionCodes: string[],
  roles: Role[],
): TourDefinition | null {
  const candidates = PRODUCT_TOURS.filter((tour) => {
    if (tour.portal !== portal) return false;
    if (!tour.autoStart) return false;
    if (!routeMatchesTour(pathname, tour)) return false;
    if (!shouldAutoStartTour(tourState, tour)) return false;
    if (
      tour.permissions?.length &&
      !hasAnyPermission(permissionCodes, tour.permissions)
    ) {
      return false;
    }
    const steps = filterTourSteps(tour.steps, permissionCodes, roles);
    return steps.length > 0;
  });

  if (!candidates.length) return null;

  // Prefer the most specific route match (longest routeMatch).
  return candidates.sort((a, b) => b.routeMatch.length - a.routeMatch.length)[0];
}

export function getPortalWelcomeTourId(portal: TourDefinition["portal"]): string {
  switch (portal) {
    case "hr":
      return "hr_portal_v1";
    case "ceo":
      return "ceo_portal_v1";
    case "manager":
      return "manager_portal_v1";
    case "employee":
      return "employee_portal_v1";
    case "system":
      return "system_portal_v1";
    default:
      return "hr_portal_v1";
  }
}

export type PopoverPosition = {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right" | "center";
};

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT_ESTIMATE = 220;
const VIEWPORT_MARGIN = 12;

export function computePopoverPosition(
  targetRect: DOMRect | null,
  preferred: TourStepDefinition["placement"] = "auto",
  isMobile: boolean,
): PopoverPosition {
  if (isMobile || !targetRect) {
    return {
      top: window.innerHeight - POPOVER_HEIGHT_ESTIMATE - VIEWPORT_MARGIN,
      left: VIEWPORT_MARGIN,
      placement: "bottom",
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let placement: PopoverPosition["placement"] =
    preferred === "auto" ? "bottom" : preferred;

  const spaceTop = targetRect.top;
  const spaceBottom = viewportHeight - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = viewportWidth - targetRect.right;

  if (preferred === "auto") {
    if (spaceBottom >= POPOVER_HEIGHT_ESTIMATE + 16) placement = "bottom";
    else if (spaceTop >= POPOVER_HEIGHT_ESTIMATE + 16) placement = "top";
    else if (spaceRight >= POPOVER_WIDTH + 16) placement = "right";
    else placement = "left";
  }

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = targetRect.top - POPOVER_HEIGHT_ESTIMATE - 12;
      left = targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2;
      break;
    case "bottom":
      top = targetRect.bottom + 12;
      left = targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2;
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
      left = targetRect.left - POPOVER_WIDTH - 12;
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
      left = targetRect.right + 12;
      break;
    default:
      top = targetRect.bottom + 12;
      left = targetRect.left;
  }

  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, viewportWidth - POPOVER_WIDTH - VIEWPORT_MARGIN),
  );
  top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(top, viewportHeight - POPOVER_HEIGHT_ESTIMATE - VIEWPORT_MARGIN),
  );

  return { top, left, placement };
}
