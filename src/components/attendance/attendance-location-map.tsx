"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Expand, MapPin, Minimize2 } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

import { cn } from "@/lib/utils";

export type AttendanceLocationMapOverlay = {
  address?: string | null;
  latitude: number;
  longitude: number;
  /** Exact display strings for the floating card (same values as map center). */
  latitudeLabel?: string;
  longitudeLabel?: string;
  accuracyMeters?: number | null;
  recordedAtLabel?: string | null;
  employeeName?: string | null;
  punchLabel?: string | null;
};

type Props = {
  latitude: number;
  longitude: number;
  overlay?: AttendanceLocationMapOverlay;
  className?: string;
};

const MAP_HEIGHT_PX = 500;

/**
 * Client-only Leaflet + OSM map for attendance GPS.
 *
 * Blank-map root cause: relying on Tailwind arbitrary height classes inside a
 * dynamically imported chunk can leave the host at 0px (footer strip visible,
 * overlays clipped by overflow:hidden). Height/width are set with inline styles.
 */
export function AttendanceLocationMap({
  latitude,
  longitude,
  overlay,
  className,
}: Props) {
  const reactId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [failed, setFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [latitude, longitude]);

  useEffect(() => {
    function onFullscreenChange() {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      window.setTimeout(() => {
        mapRef.current?.invalidateSize({ animate: false });
      }, 150);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const node = mapNodeRef.current;
    if (!node || typeof window === "undefined") return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let map: LeafletMap | null = null;
    const timers: number[] = [];

    setFailed(false);

    async function mountMap() {
      try {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default;

        if (cancelled || !mapNodeRef.current) return;
        const host = mapNodeRef.current;

        // Ensure the host has a real box before Leaflet measures it.
        host.style.width = "100%";
        host.style.height = isFullscreen ? "100vh" : `${MAP_HEIGHT_PX}px`;
        host.style.minHeight = isFullscreen ? "100vh" : `${MAP_HEIGHT_PX}px`;

        const stale = host as HTMLDivElement & { _leaflet_id?: number };
        if (stale._leaflet_id) {
          stale._leaflet_id = undefined;
          host.replaceChildren();
        }

        const pinIcon = L.divIcon({
          className: "attendance-location-marker",
          html: `<span aria-hidden="true" style="display:block;width:28px;height:36px;line-height:0;">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#e11d48"/>
              <circle cx="14" cy="14" r="5.5" fill="#ffffff"/>
            </svg>
          </span>`,
          iconSize: [28, 36],
          iconAnchor: [14, 34],
        });

        map = L.map(host, {
          center: [latitude, longitude],
          zoom: 17,
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: true,
          dragging: true,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          subdomains: "abc",
          crossOrigin: true,
        }).addTo(map);

        const marker = L.marker([latitude, longitude], {
          icon: pinIcon,
          keyboard: false,
        }).addTo(map);

        mapRef.current = map;
        markerRef.current = marker;

        const invalidate = () => {
          if (cancelled || !map) return;
          map.invalidateSize({ animate: false });
          map.setView([latitude, longitude], 17, { animate: false });
        };

        // Paint → layout → invalidate (Leaflet needs non-zero size).
        requestAnimationFrame(() => {
          invalidate();
          timers.push(window.setTimeout(invalidate, 50));
          timers.push(window.setTimeout(invalidate, 250));
          timers.push(window.setTimeout(invalidate, 600));
        });

        resizeObserver = new ResizeObserver(() => invalidate());
        resizeObserver.observe(host);
        if (shellRef.current) resizeObserver.observe(shellRef.current);

        map.whenReady(() => invalidate());
      } catch (error) {
        console.error("[AttendanceLocationMap] Leaflet init failed", error);
        if (!cancelled) setFailed(true);
      }
    }

    void mountMap();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      resizeObserver?.disconnect();
      if (map) {
        map.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
      if (node) {
        const stale = node as HTMLDivElement & { _leaflet_id?: number };
        stale._leaflet_id = undefined;
        node.replaceChildren();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on coordinate change
  }, [latitude, longitude, reactId]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 17, { animate: false });
    map.invalidateSize({ animate: false });

    const popupLines = [
      overlay?.employeeName?.trim()
        ? `<strong>${escapeHtml(overlay.employeeName.trim())}</strong>`
        : null,
      overlay?.punchLabel?.trim()
        ? escapeHtml(overlay.punchLabel.trim())
        : null,
      `<span>Lat ${escapeHtml(overlay?.latitudeLabel ?? String(latitude))}</span>`,
      `<span>Lng ${escapeHtml(overlay?.longitudeLabel ?? String(longitude))}</span>`,
      overlay?.accuracyMeters != null
        ? `<span>Accuracy ±${Math.round(overlay.accuracyMeters)} m</span>`
        : null,
    ].filter(Boolean);

    marker.bindPopup(
      `<div style="font:12px/1.45 system-ui,sans-serif;min-width:10rem">${popupLines.join("<br/>")}</div>`,
      { closeButton: true, maxWidth: 260 },
    );
  }, [latitude, longitude, overlay]);

  async function toggleFullscreen() {
    const node = shellRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await node.requestFullscreen();
    } catch {
      // Ignore fullscreen rejection from the browser.
    }
  }

  const frameStyle: CSSProperties = isFullscreen
    ? { width: "100%", height: "100vh", minHeight: "100vh" }
    : {
        width: "100%",
        height: MAP_HEIGHT_PX,
        minHeight: MAP_HEIGHT_PX,
      };

  if (failed) {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border bg-muted/40 px-6 text-center",
          className,
        )}
        style={frameStyle}
      >
        <MapPin className="size-8 text-rose-600" />
        <div>
          <p className="text-sm font-medium text-foreground">Map could not be loaded</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Coordinates remain available in the recorded location card. You can
            retry loading the map without leaving this page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFailed(false)}
          className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          Retry map
        </button>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        "w-full overflow-hidden rounded-xl border bg-card shadow-sm",
        isFullscreen && "rounded-none border-0",
        className,
      )}
    >
      <div className="relative bg-muted/40" style={frameStyle}>
        <div
          ref={mapNodeRef}
          id={`attendance-location-map-${reactId.replace(/:/g, "")}`}
          className="attendance-location-leaflet z-0"
          style={frameStyle}
        />

        {overlay ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] p-3 sm:inset-x-auto sm:left-3 sm:top-3 sm:w-[min(100%,24rem)]">
            <div className="pointer-events-auto rounded-xl border bg-card p-4 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
              <div className="mb-3 flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                  <MapPin className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    Recorded Location
                  </p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                    {overlay.address?.trim() ||
                      `${overlay.latitudeLabel ?? overlay.latitude}, ${overlay.longitudeLabel ?? overlay.longitude}`}
                  </p>
                </div>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Latitude</dt>
                  <dd className="min-w-0 whitespace-nowrap text-right font-semibold tabular-nums tracking-tight text-foreground">
                    {overlay.latitudeLabel ?? String(overlay.latitude)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Longitude</dt>
                  <dd className="min-w-0 whitespace-nowrap text-right font-semibold tabular-nums tracking-tight text-foreground">
                    {overlay.longitudeLabel ?? String(overlay.longitude)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Accuracy</dt>
                  <dd className="font-semibold text-foreground">
                    {overlay.accuracyMeters != null
                      ? `${Math.round(overlay.accuracyMeters)} m`
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Recorded</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {overlay.recordedAtLabel ?? "—"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 border-t pt-2.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
                Recorded from employee device
              </p>
            </div>
          </div>
        ) : null}

        <div className="absolute right-3 top-3 z-[5]">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex size-9 items-center justify-center rounded-lg border bg-card text-foreground shadow-sm transition hover:bg-muted"
            aria-label={isFullscreen ? "Exit fullscreen map" : "Expand map"}
            title={isFullscreen ? "Exit fullscreen" : "Expand map"}
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Expand className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
