"use client";

import { format, parseISO, isValid } from "date-fns";
import { useEffect, useState } from "react";

import { AssetDevicePreview } from "@/components/assets/asset-device-preview";
import { Modal } from "@/components/common/modal";
import { getAssetImageUrlAction } from "@/lib/assets/actions";
import { parseEmployeeRequestDetails } from "@/lib/assets/activity-utils";

export type AssetRequestViewModel = {
  title: string;
  assetName: string;
  assetCode: string;
  employeeName?: string | null;
  performedByName?: string | null;
  submittedAt: string;
  issue: string;
  notes?: string | null;
  categoryName?: string | null;
  brand?: string | null;
  model?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
};

function formatWhen(value: string) {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd MMM yyyy · h:mm a");
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium leading-snug break-words">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

type Props = {
  request: AssetRequestViewModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssetRequestDetailDialog({ request, open, onOpenChange }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !request) {
      setImageUrl(null);
      return;
    }
    if (request.imageUrl) {
      setImageUrl(request.imageUrl);
      return;
    }
    if (!request.imagePath) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    getAssetImageUrlAction(request.imagePath).then((result) => {
      if (cancelled) return;
      setImageUrl(result.success ? result.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, request]);

  const parsed = request ? parseEmployeeRequestDetails(request.issue, request.notes) : null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={request?.title ?? "Request details"}
      description={request ? `${request.assetName} · ${request.assetCode}` : undefined}
      contentClassName="sm:max-w-2xl"
      showCancel={false}
    >
      {request ? (
        <div className="space-y-5">
          <AssetDevicePreview
            categoryName={request.categoryName}
            brand={request.brand}
            model={request.model}
            name={request.assetName}
            imageUrl={imageUrl}
            size="xl"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Asset" value={`${request.assetName} (${request.assetCode})`} />
            <Detail label="Reported by" value={request.performedByName ?? request.employeeName} />
            <Detail label="Type" value={parsed?.typeLabel ?? request.title} />
            <Detail label="Sent" value={formatWhen(request.submittedAt)} />
            {parsed?.severity ? <Detail label="Severity" value={parsed.severity} /> : null}
          </div>

          <div className="rounded-lg border bg-muted/10 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              What was written
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {parsed?.message || request.issue}
            </p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
