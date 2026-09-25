/**
 * iFranchise brand assets.
 * Email logo source of truth: `src/assets/iF-Logo.png` (single mark for all HRMS emails).
 */

/** Compact IF mark (favicon, collapsed sidebar, small tiles). */
export const BRAND_MARK_PATH = "/images/logo-mark.png";

/**
 * Public HTTP path for the IF mark (synced from `src/assets/iF-Logo.png`).
 * Used as a fallback when CID inline embedding is unavailable.
 */
export const DEFAULT_BRAND_LOGO_PATH = "/images/logo.png";

/**
 * Absolute workspace-relative path of the only email logo asset.
 * Read by the server-side CID attachment helper — never use Logo.png / logoif / horizontal lockups in emails.
 */
export const EMAIL_BRAND_LOGO_ASSET_RELATIVE_PATH = "src/assets/iF-Logo.png";

/** @deprecated Alias of {@link DEFAULT_BRAND_LOGO_PATH} — emails use iF-Logo only. */
export const EMAIL_BRAND_LOGO_PATH = DEFAULT_BRAND_LOGO_PATH;

/**
 * @deprecated Prefer {@link DEFAULT_BRAND_LOGO_PATH}.
 * Kept so existing imports resolve to the same IF mark used in emails.
 */
export const BRAND_LOGO_FULL_PATH = DEFAULT_BRAND_LOGO_PATH;

/** Horizontal without tagline: IF mark + iFranchise (website / UI lockups — not emails). */
export const BRAND_LOGO_WORDMARK_PATH = "/images/logo-wordmark.png";

/** Wordmark + tagline only (pair with animated IF mark tile). */
export const BRAND_WORDMARK_TAGLINE_PATH = "/images/logo-wordmark-tagline.png";

export const BRAND_NAME = "iFranchise";
export const BRAND_TAGLINE = "CONNECT. EXPAND. GROW.";
export const BRAND_PURPLE = "#3016B0";

/** Safe display width (px) for the nearly-square IF mark in email headers. */
export const EMAIL_BRAND_LOGO_DISPLAY_WIDTH = 120;

/** CID for inline embedding of `src/assets/iF-Logo.png` in HTML emails (Gmail-safe). */
export const EMAIL_BRAND_LOGO_CID = "ifranchise-logo";
export const EMAIL_BRAND_LOGO_CID_SRC = `cid:${EMAIL_BRAND_LOGO_CID}`;
