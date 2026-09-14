/**
 * Official iFranchise HRMS payslip design system.
 *
 * ALL payslip previews, downloads, emails, print, and exports must use:
 * - Screen / print: `PayslipTemplate` via `PayslipView`
 * - PDF bytes: `generatePayslipPdfBytes` (mirrors the same visual structure)
 *
 * Do NOT introduce alternate payslip layouts unless explicitly instructed.
 * Do NOT change payroll calculations here — tokens and decorative geometry only.
 */

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand/constants";

export const PAYSLIP_DESIGN = {
  purpleDeep: "#1a0a72",
  purple: "#2b12a8",
  purpleMid: "#3a1fd0",
  purpleBand: "#3016B0",
  sectionTitle: "#3016B0",
  labelMuted: "#5b4bb8",
  highlightRow: "#efeafc",
  panelBg: "#f8f7fc",
  brandName: BRAND_NAME,
  brandTagline: BRAND_TAGLINE,
  legalNameFallback: "iFranchise Services Private Limited",
  confidentialLabel: "PRIVATE • CONFIDENTIAL",
} as const;

export function payslipPurpleGradientCss(angle = 118): string {
  return `linear-gradient(${angle}deg, ${PAYSLIP_DESIGN.purpleDeep} 0%, ${PAYSLIP_DESIGN.purple} 46%, ${PAYSLIP_DESIGN.purpleMid} 100%)`;
}

/** Hex → 0–1 RGB channels for pdf-lib. */
export function payslipHexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "");
  return {
    r: parseInt(raw.slice(0, 2), 16) / 255,
    g: parseInt(raw.slice(2, 4), 16) / 255,
    b: parseInt(raw.slice(4, 6), 16) / 255,
  };
}

/**
 * Right-side ribbon paths (SVG viewBox 0 0 360 360).
 * Shared by screen template and PDF so both stay visually aligned.
 */
export const PAYSLIP_WAVE_PATHS = [
  {
    d: "M40 -20 C 110 70, 20 140, 95 210 C 165 275, 70 320, 120 380 L 360 380 L 360 -20 Z",
    opacity: 0.12,
  },
  {
    d: "M130 -20 C 185 75, 105 145, 165 215 C 225 280, 155 325, 200 380 L 360 380 L 360 -20 Z",
    opacity: 0.14,
  },
  {
    d: "M230 -20 C 270 80, 215 150, 255 220 C 295 285, 250 330, 275 380 L 360 380 L 360 -20 Z",
    opacity: 0.08,
  },
] as const;

export const PAYSLIP_HEADER_BOTTOM_WAVE =
  "M0 28C180 8 320 0 480 18C640 36 780 58 1000 34V80H0V28Z";

export const PAYSLIP_FOOTER_TOP_WAVE =
  "M0 42C220 18 360 8 520 24C680 40 820 58 1000 28V0H0V42Z";
