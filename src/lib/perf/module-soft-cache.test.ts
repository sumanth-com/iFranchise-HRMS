import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getModuleSoftCache,
  invalidateModuleSoftCache,
  moduleSoftCacheKey,
  setModuleSoftCache,
} from "@/lib/perf/module-soft-cache";

describe("module soft cache", () => {
  it("scopes by org + employee and supports invalidate", () => {
    const keyA = moduleSoftCacheKey("docs", {
      organizationId: "org-1",
      employeeId: "emp-1",
    });
    const keyB = moduleSoftCacheKey("docs", {
      organizationId: "org-1",
      employeeId: "emp-2",
    });

    setModuleSoftCache(keyA, { files: 1 });
    setModuleSoftCache(keyB, { files: 2 });

    assert.deepEqual(getModuleSoftCache(keyA), { files: 1 });
    assert.deepEqual(getModuleSoftCache(keyB), { files: 2 });

    invalidateModuleSoftCache(keyA);
    assert.equal(getModuleSoftCache(keyA), null);
    assert.deepEqual(getModuleSoftCache(keyB), { files: 2 });
  });
});
