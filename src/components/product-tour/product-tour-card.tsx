"use client";

import { Map } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/common/button";
import { TOUR_PENDING_START_KEY } from "@/lib/product-tour/constants";
import { PRODUCT_TOUR_MAP } from "@/lib/product-tour/tour-registry";
import { getPortalWelcomeTourId } from "@/lib/product-tour/tour-utils";
import { useAuth } from "@/providers/auth-provider";
import { useActivePortal } from "@/providers/active-portal-provider";
import { useProductTour } from "@/providers/product-tour-provider";

export function ProductTourCard() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const { activePortal } = useActivePortal();
  const { tourState, startTour } = useProductTour();
  const welcomeTourId = getPortalWelcomeTourId(activePortal);
  const welcomeTour = PRODUCT_TOUR_MAP.get(welcomeTourId);
  const status = tourState[welcomeTourId]?.status;
  const statusLabel =
    status === "completed"
      ? "Completed"
      : status === "skipped"
        ? "Skipped"
        : status === "in_progress"
          ? "In progress"
          : "Not started";

  function handleStart() {
    const destination = welcomeTour?.routeMatch;
    if (destination && pathname !== destination) {
      sessionStorage.setItem(
        TOUR_PENDING_START_KEY,
        JSON.stringify({ userId: profile.userId, tourId: welcomeTourId }),
      );
      router.push(destination);
      return;
    }
    startTour(welcomeTourId, { force: true });
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Map className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Product tour</h3>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Take a quick guided tour of your HRMS portal. Optional — you can skip anytime and
            restart later without affecting your data.
          </p>
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={handleStart}>
              Start tour
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
