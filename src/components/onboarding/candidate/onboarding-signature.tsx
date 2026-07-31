"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_SIGNATURE_STYLES } from "@/types/onboarding";

type OnboardingSignatureProps = {
  fullName: string;
  onSave: (payload: {
    signatureType: "typed" | "drawn" | "uploaded";
    signatureStyle?: string | null;
    signatureData: string;
  }) => Promise<void>;
  disabled?: boolean;
};

export function OnboardingSignature({ fullName, onSave, disabled }: OnboardingSignatureProps) {
  const [mode, setMode] = useState<"typed" | "drawn" | "uploaded">("typed");
  const [styleId, setStyleId] = useState<string>(ONBOARDING_SIGNATURE_STYLES[0].id);
  const [typedName, setTypedName] = useState(fullName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedStyle = ONBOARDING_SIGNATURE_STYLES.find((s) => s.id === styleId);

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    ctx.beginPath();
    ctx.moveTo(point.clientX - rect.left, point.clientY - rect.top);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    ctx.lineTo(point.clientX - rect.left, point.clientY - rect.top);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function endDraw() {
    setDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === "typed") {
        await onSave({
          signatureType: "typed",
          signatureStyle: styleId,
          signatureData: typedName,
        });
      } else if (mode === "drawn") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        await onSave({
          signatureType: "drawn",
          signatureData: canvas.toDataURL("image/png"),
        });
      } else if (uploadPreview) {
        await onSave({
          signatureType: "uploaded",
          signatureData: uploadPreview,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap gap-2">
        {(["typed", "drawn", "uploaded"] as const).map((m) => (
          <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
            {m === "typed" ? "Generate" : m === "drawn" ? "Draw" : "Upload"}
          </Button>
        ))}
      </div>

      {mode === "typed" && (
        <div className="space-y-3">
          <div>
            <Label>Name for signature</Label>
            <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ONBOARDING_SIGNATURE_STYLES.map((s) => (
              <Button key={s.id} size="sm" variant={styleId === s.id ? "default" : "outline"} onClick={() => setStyleId(s.id)}>
                {s.label}
              </Button>
            ))}
          </div>
          <div
            className="rounded-lg border bg-white p-6 text-3xl"
            style={{ fontFamily: selectedStyle?.fontFamily }}
          >
            {typedName || fullName}
          </div>
        </div>
      )}

      {mode === "drawn" && (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={500}
            height={160}
            className="w-full rounded-lg border bg-white touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <Button size="sm" variant="outline" onClick={clearCanvas}>Clear</Button>
        </div>
      )}

      {mode === "uploaded" && (
        <div className="space-y-2">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setUploadPreview(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
          {uploadPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploadPreview} alt="Signature preview" className="max-h-32 rounded border" />
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={disabled || saving}>
        Finalize signature
      </Button>
    </div>
  );
}
