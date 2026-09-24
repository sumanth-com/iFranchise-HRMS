import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prefetchCachedModalDetail } from "@/lib/ui/use-cached-modal-detail";

describe("prefetchCachedModalDetail", () => {
  it("dedupes concurrent fetches for the same id and caches the result", async () => {
    const cache = new Map<string, { id: string; value: number }>();
    const inflight = new Map<string, Promise<{ id: string; value: number } | null>>();
    let calls = 0;

    const fetchDetail = async (id: string) => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { id, value: 42 };
    };

    const [a, b] = await Promise.all([
      prefetchCachedModalDetail("p1", fetchDetail, cache, inflight),
      prefetchCachedModalDetail("p1", fetchDetail, cache, inflight),
    ]);

    assert.equal(calls, 1);
    assert.deepEqual(a, { id: "p1", value: 42 });
    assert.deepEqual(b, { id: "p1", value: 42 });
    assert.deepEqual(cache.get("p1"), { id: "p1", value: 42 });

    const c = await prefetchCachedModalDetail("p1", fetchDetail, cache, inflight);
    assert.equal(calls, 1);
    assert.deepEqual(c, { id: "p1", value: 42 });
  });
});
