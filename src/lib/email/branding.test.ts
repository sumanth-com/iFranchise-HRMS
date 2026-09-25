import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_BRAND_LOGO_PATH,
  EMAIL_BRAND_LOGO_ASSET_RELATIVE_PATH,
  EMAIL_BRAND_LOGO_CID_SRC,
  EMAIL_BRAND_LOGO_DISPLAY_WIDTH,
} from "@/lib/brand/constants";
import {
  resolveEmailBrandLogoUrl,
  renderBrandedEmail,
} from "@/lib/email/branding";
import { getIfranchiseEmailLogoAttachment } from "@/lib/email/brand-logo-attachment";
import { PRODUCTION_CANONICAL_APP_URL } from "@/lib/url/app-origin";

describe("resolveEmailBrandLogoUrl", () => {
  it("uses the public copy of iF-Logo.png", () => {
    const url = resolveEmailBrandLogoUrl();
    assert.ok(url.endsWith(DEFAULT_BRAND_LOGO_PATH));
    assert.ok(!url.includes("logo-horizontal.png"));
    assert.ok(!url.includes("email-logo.png") || url.endsWith(DEFAULT_BRAND_LOGO_PATH));
  });

  it("never points at localhost for inbox clients", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    try {
      const url = resolveEmailBrandLogoUrl();
      assert.equal(url, `${PRODUCTION_CANONICAL_APP_URL}${DEFAULT_BRAND_LOGO_PATH}`);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});

describe("renderBrandedEmail logo", () => {
  it("centers the iF-Logo via CID with width-only sizing", () => {
    const html = renderBrandedEmail({
      title: "Test",
      heading: "Leave approval required",
      contentHtml: "<p>Body</p>",
    });
    assert.match(html, new RegExp(`src="${EMAIL_BRAND_LOGO_CID_SRC}"`));
    assert.match(html, new RegExp(`width="${EMAIL_BRAND_LOGO_DISPLAY_WIDTH}"`));
    assert.match(html, /height:auto/);
    assert.match(html, /margin:0 auto/);
    assert.equal((html.match(/class="email-brand-logo"/g) ?? []).length, 1);
    assert.doesNotMatch(html, /logo-horizontal\.png/);
    assert.doesNotMatch(html, /Logo\.png/);
    assert.doesNotMatch(html, /logoif/i);
    assert.doesNotMatch(html, /CONNECT\. EXPAND\. GROW\./);
  });

  it("loads the attachment from src/assets/iF-Logo.png only", () => {
    assert.equal(EMAIL_BRAND_LOGO_ASSET_RELATIVE_PATH, "src/assets/iF-Logo.png");
    const attachment = getIfranchiseEmailLogoAttachment();
    assert.equal(attachment.filename, "iF-Logo.png");
    assert.ok(attachment.content.byteLength > 1000);
  });
});
