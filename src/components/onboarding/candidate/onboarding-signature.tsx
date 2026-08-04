"use client";

import { useRef, useState } from "react";
import {
  Caveat,
  Dancing_Script,
  Great_Vibes,
  Pacifico,
  Satisfy,
  Zeyada,
} from "next/font/google";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ONBOARDING_SIGNATURE_STYLES } from "@/types/onboarding";

const fontCasual = Dancing_Script({ subsets: ["latin"], variable: "--font-signature-casual" });
const fontRound = Pacifico({ subsets: ["latin"], weight: "400", variable: "--font-signature-round" });
const fontElegant = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-signature-elegant" });
const fontFormal = Caveat({ subsets: ["latin"], variable: "--font-signature-formal" });
const fontBold = Satisfy({ subsets: ["latin"], weight: "400", variable: "--font-signature-bold" });
const fontClassic = Zeyada({ subsets: ["latin"], weight: "400", variable: "--font-signature-classic" });

const SIGNATURE_FONT_VARS = [
  fontCasual.variable,
  fontRound.variable,
  fontElegant.variable,
  fontFormal.variable,
  fontBold.variable,
  fontClassic.variable,
].join(" ");

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
  const [inkColor, setInkColor] = useState("#0f172a");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedStyle = ONBOARDING_SIGNATURE_STYLES.find((s) => s.id === styleId);
  const displayName = typedName.trim() || fullName;

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
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
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
        if (!displayName.trim()) return;
        await onSave({
          signatureType: "typed",
          signatureStyle: styleId,
          signatureData: displayName,
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

  const inkOptions = [
    { value: "#0f172a", label: "Black" },
    { value: "#2563eb", label: "Blue" },
    { value: "#7c3aed", label: "Purple" },
  ];

  return (
    <div className={cn("mx-auto max-w-xl space-y-5", SIGNATURE_FONT_VARS)}>
      <div className="flex flex-wrap justify-center gap-2">
        {(["typed", "drawn", "uploaded"] as const).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
            className="min-w-[5.5rem]"
          >
            {m === "typed" ? "Type" : m === "drawn" ? "Draw" : "Upload"}
          </Button>
        ))}
      </div>

      {mode === "typed" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Name for signature</Label>
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={fullName}
              className="h-10 text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium text-muted-foreground">Ink color</Label>
            <div className="flex gap-2">
              {inkOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  onClick={() => setInkColor(option.value)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-105",
                    inkColor === option.value ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </div>
          </div>

          <div
            className="flex min-h-[7rem] items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-white px-6 py-5"
            style={{
              fontFamily: selectedStyle?.fontFamily,
              color: inkColor,
              fontSize: "2.25rem",
              lineHeight: 1.2,
            }}
          >
            {displayName}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ONBOARDING_SIGNATURE_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setStyleId(style.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/30",
                  styleId === style.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/80 bg-background",
                )}
              >
                <span
                  className="block truncate text-2xl leading-tight"
                  style={{ fontFamily: style.fontFamily, color: inkColor }}
                >
                  {displayName}
                </span>
                <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {style.label}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setTypedName(fullName)}
            >
              Clear signature
            </button>
          </div>
        </div>
      )}

      {mode === "drawn" && (
        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            width={560}
            height={180}
            className="w-full rounded-xl border-2 border-dashed border-border/80 bg-white touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <div className="flex justify-center">
            <Button size="sm" variant="outline" onClick={clearCanvas}>Clear drawing</Button>
          </div>
        </div>
      )}

      {mode === "uploaded" && (
        <div className="space-y-3">
          <Input
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setUploadPreview(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
          {uploadPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploadPreview}
              alt="Signature preview"
              className="mx-auto max-h-36 rounded-lg border bg-white p-2"
            />
          ) : null}
        </div>
      )}

      <div className="flex justify-center pt-1">
        <Button onClick={handleSave} disabled={disabled || saving} className="min-w-[10rem]">
          {saving ? "Saving…" : "Finalize signature"}
        </Button>
      </div>
    </div>
  );
}
