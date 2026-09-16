/**
 * iFranchise brand assets — single source of truth is src/assets/iF-Logo.png (IF mark).
 * Horizontal lockups and wordmark strips are derived from that mark; never recreate the IF art.
 */

/** Compact IF mark (favicon, collapsed sidebar, small tiles). */
export const BRAND_MARK_PATH = "/images/logo-mark.png";

/** Default / email mark — public copy of src/assets/iF-Logo.png. */
export const DEFAULT_BRAND_LOGO_PATH = "/images/logo.png";

/**
 * Email-optimized IF mark (same art as iF-Logo.png, sized for clients).
 * Always reference via absolute `${origin}${EMAIL_BRAND_LOGO_PATH}` in HTML emails.
 */
export const EMAIL_BRAND_LOGO_PATH = "/images/email-logo.png";

/** Full horizontal lockup: IF mark + iFranchise + CONNECT. EXPAND. GROW. */
export const BRAND_LOGO_FULL_PATH = "/images/logo-horizontal.png";

/** Horizontal without tagline: IF mark + iFranchise. */
export const BRAND_LOGO_WORDMARK_PATH = "/images/logo-wordmark.png";

/** Wordmark + tagline only (pair with animated IF mark tile). */
export const BRAND_WORDMARK_TAGLINE_PATH = "/images/logo-wordmark-tagline.png";

export const BRAND_NAME = "iFranchise";
export const BRAND_TAGLINE = "CONNECT. EXPAND. GROW.";
export const BRAND_PURPLE = "#3016B0";
