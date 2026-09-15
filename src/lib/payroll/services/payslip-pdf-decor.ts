import sharp from "sharp";

import {
  PAYSLIP_WAVE_PATHS,
  PAYSLIP_FOOTER_TOP_WAVE,
  PAYSLIP_HEADER_BOTTOM_WAVE,
} from "@/lib/payroll/services/payslip-design";

const wavePngCache = new Map<string, Uint8Array>();

function buildWaveSvg(options: {
  width: number;
  height: number;
}): string {
  const { width, height } = options;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 360 360" preserveAspectRatio="xMaxYMid slice">
  <defs>
    <linearGradient id="pw-a" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#c4b5fd" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="pw-b" x1="10%" y1="0%" x2="100%" y2="90%">
      <stop offset="0%" stop-color="#ddd6fe" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <path d="${PAYSLIP_WAVE_PATHS[0].d}" fill="url(#pw-a)"/>
  <path d="${PAYSLIP_WAVE_PATHS[1].d}" fill="url(#pw-b)"/>
  <path d="${PAYSLIP_WAVE_PATHS[2].d}" fill="#ffffff" opacity="${PAYSLIP_WAVE_PATHS[2].opacity}"/>
</svg>`;
}

function buildEdgeWaveSvg(options: {
  width: number;
  height: number;
  path: string;
  viewBoxHeight: number;
}): string {
  const { width, height, path, viewBoxHeight } = options;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1000 ${viewBoxHeight}" preserveAspectRatio="none">
  <path d="${path}" fill="#ffffff"/>
</svg>`;
}

async function svgToPng(
  svg: string,
  width: number,
  height: number,
  flipVertical = false,
): Promise<Uint8Array> {
  let pipeline = sharp(Buffer.from(svg)).resize(width, height, { fit: "fill" });
  if (flipVertical) {
    pipeline = pipeline.flip();
  }
  const buffer = await pipeline.png().toBuffer();
  return new Uint8Array(buffer);
}

/** Soft right-side ribbons — same geometry as the screen payslip template. */
export async function loadPayslipWaveDecorPng(options: {
  width: number;
  height: number;
  mirror?: boolean;
}): Promise<Uint8Array> {
  const key = `wave:${options.width}x${options.height}:${options.mirror ? "m" : "n"}`;
  const cached = wavePngCache.get(key);
  if (cached) return cached;

  const png = await svgToPng(
    buildWaveSvg({
      width: options.width,
      height: options.height,
    }),
    options.width,
    options.height,
    options.mirror,
  );
  wavePngCache.set(key, png);
  return png;
}

/** White curved edge used under the header / above the footer. */
export async function loadPayslipEdgeWavePng(options: {
  width: number;
  height: number;
  variant: "header-bottom" | "footer-top";
}): Promise<Uint8Array> {
  const key = `edge:${options.variant}:${options.width}x${options.height}`;
  const cached = wavePngCache.get(key);
  if (cached) return cached;

  const path =
    options.variant === "header-bottom"
      ? PAYSLIP_HEADER_BOTTOM_WAVE
      : PAYSLIP_FOOTER_TOP_WAVE;
  const viewBoxHeight = options.variant === "header-bottom" ? 80 : 70;

  const png = await svgToPng(
    buildEdgeWaveSvg({
      width: options.width,
      height: options.height,
      path,
      viewBoxHeight,
    }),
    options.width,
    options.height,
  );
  wavePngCache.set(key, png);
  return png;
}
