import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPhoneUserAgent,
  isTabletAccessClient,
  isTabletUserAgent,
} from "@/lib/device-access/tablet-device";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IPADOS_DESKTOP_SITE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

describe("tablet device detection", () => {
  it("treats phones as phones, not tablets", () => {
    assert.equal(isPhoneUserAgent(IPHONE), true);
    assert.equal(isTabletUserAgent(IPHONE), false);
    assert.equal(isPhoneUserAgent(ANDROID_PHONE), true);
    assert.equal(isTabletUserAgent(ANDROID_PHONE), false);
  });

  it("detects iPad and Android tablets", () => {
    assert.equal(isTabletUserAgent(IPAD), true);
    assert.equal(isTabletUserAgent(ANDROID_TABLET), true);
    assert.equal(isTabletUserAgent(DESKTOP_CHROME), false);
  });

  it("never treats desktop UA as tablet unless the client hints tablet", () => {
    assert.equal(
      isTabletAccessClient({ userAgent: DESKTOP_CHROME, deviceCookie: "desktop" }),
      false,
    );
    assert.equal(
      isTabletAccessClient({ userAgent: DESKTOP_CHROME, formDevice: "tablet" }),
      true,
    );
  });

  it("does not let a desktop cookie override iPad UA", () => {
    assert.equal(
      isTabletAccessClient({ userAgent: IPAD, deviceCookie: "desktop" }),
      true,
    );
  });

  it("uses the tablet cookie for iPadOS desktop-site UA", () => {
    assert.equal(isTabletUserAgent(IPADOS_DESKTOP_SITE), false);
    assert.equal(
      isTabletAccessClient({
        userAgent: IPADOS_DESKTOP_SITE,
        deviceCookie: "tablet",
      }),
      true,
    );
  });
});
