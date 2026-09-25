import { readFileSync } from "node:fs";
import path from "node:path";

import {
  EMAIL_BRAND_LOGO_ASSET_RELATIVE_PATH,
  EMAIL_BRAND_LOGO_CID,
} from "@/lib/brand/constants";
import type { SendEmailInput } from "@/lib/email/mailer";

/**
 * Inline CID attachment for the official iFranchise email logo.
 * Source of truth: `src/assets/iF-Logo.png` only.
 * Server-only — do not import from Client Components.
 */
export function getIfranchiseEmailLogoAttachment(): NonNullable<
  SendEmailInput["attachments"]
>[number] {
  const filePath = path.join(process.cwd(), ...EMAIL_BRAND_LOGO_ASSET_RELATIVE_PATH.split("/"));
  const content = readFileSync(filePath);
  return {
    filename: "iF-Logo.png",
    content,
    contentType: "image/png",
    cid: EMAIL_BRAND_LOGO_CID,
    contentDisposition: "inline",
  };
}

/** True when HTML references the shared email logo CID. */
export function htmlNeedsIfranchiseEmailLogo(html: string): boolean {
  return html.includes(`cid:${EMAIL_BRAND_LOGO_CID}`);
}
