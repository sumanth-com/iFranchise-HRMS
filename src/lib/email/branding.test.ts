import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BRAND_LOGO_FULL_PATH } from "@/lib/brand/constants";
import {
  resolveEmailBrandLogoUrl,
  renderBrandedEmail,
} from "@/lib/email/branding";
import { PRODUCTION_CANONICAL_APP_URL } from "@/lib/url/app-origin";

describe("resolveEmailBrandLogoUrl", () => {
  it("uses the full iFranchise lockup path", () => {
    const url = resolveEmailBrandLogoUrl();
    assert.ok(url.endsWith(BRAND_LOGO_FULL_PATH));
    assert.ok(!url.includes("email-logo.png"));
  });

  it("never points at localhost for inbox clients", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    try {
      const url = resolveEmailBrandLogoUrl();
      assert.equal(url, `${PRODUCTION_CANONICAL_APP_URL}${BRAND_LOGO_FULL_PATH}`);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});

describe("renderBrandedEmail logo", () => {
  it("centers the full logo with width-only sizing", () => {
    const html = renderBrandedEmail({
      title: "Test",
      heading: "Leave approval required",
      contentHtml: "<p>Body</p>",
    });
    assert.match(html, /logo-horizontal\.png/);
    assert.match(html, /width="200"/);
    assert.match(html, /height:auto/);
    assert.match(html, /margin:0 auto/);
    assert.doesNotMatch(html, /email-logo\.png/);
  });
});
