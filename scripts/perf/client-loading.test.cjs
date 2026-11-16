/* eslint-disable @typescript-eslint/no-require-imports -- Browser utilities tested without live HR data. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require("tsx/cjs");
const { prefetchCachedModalDetail } = require("../../src/lib/ui/use-cached-modal-detail.ts");
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }

test("modal prefetch deduplicates concurrent requests and reuses loaded records", async () => {
  const cache = new Map(), inflight = new Map(), pending = deferred(); let calls = 0;
  const fetch = () => { calls++; return pending.promise; };
  const first = prefetchCachedModalDetail("A", fetch, cache, inflight);
  const second = prefetchCachedModalDetail("A", fetch, cache, inflight);
  assert.equal(first, second);
  pending.resolve({ id: "A", version: 1 });
  await first;
  assert.deepEqual(await prefetchCachedModalDetail("A", fetch, cache, inflight), { id: "A", version: 1 });
  assert.equal(calls, 1);
  assert.equal(inflight.size, 0);
});
test("invalidated prefetch cannot restore stale data or remove its replacement request", async () => {
  const cache = new Map(), inflight = new Map(), old = deferred(), fresh = deferred();
  const first = prefetchCachedModalDetail("A", () => old.promise, cache, inflight);
  inflight.delete("A"); cache.delete("A");
  const second = prefetchCachedModalDetail("A", () => fresh.promise, cache, inflight);
  old.resolve({ id: "A", version: 1 }); await first;
  assert.equal(cache.size, 0);
  assert.equal(inflight.get("A"), second);
  fresh.resolve({ id: "A", version: 2 }); await second;
  assert.deepEqual(cache.get("A"), { id: "A", version: 2 });
});

function geolocationFixture(t) {
  const filename = require.resolve("../../src/lib/attendance/punch-geolocation.ts");
  const loaded = new Module(filename, module); loaded.filename = filename;
  loaded._compile(ts.transpileModule(readFileSync(filename, "utf8") + "\nexport { sampleBestPosition };", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  const saved = ["window", "navigator"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  t.after(() => saved.forEach(([name, descriptor]) => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]));
  const timers = new Map(), requests = [], cleared = []; let nextTimer = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { setTimeout: (callback, ms) => { const id = ++nextTimer; timers.set(id, { callback, ms }); return id; }, clearTimeout: (id) => timers.delete(id) } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { permissions: { query: async () => ({ state: "granted" }) }, geolocation: {
    getCurrentPosition: (success, error, options) => requests.push({ success, error, options }),
    watchPosition: (success, error, options) => { requests.push({ success, error, options }); return 42; },
    clearWatch: (id) => cleared.push(id),
  } } });
  const tick = (ms) => { const pair = [...timers.entries()].find(([, entry]) => entry.ms === ms); assert.ok(pair); timers.delete(pair[0]); pair[1].callback(); };
  const position = (accuracy) => ({ coords: { latitude: 17.123456789, longitude: 78.987654321, accuracy } });
  return { ...loaded.exports, timers, requests, cleared, tick, position };
}
test("settled GPS sampling ignores late callbacks instead of leaking another refinement timer", async (t) => {
  const f = geolocationFixture(t);
  const pending = f.sampleBestPosition({ enableHighAccuracy: true, timeoutMs: 10000, source: "high_accuracy" });
  f.tick(10000);
  assert.equal((await pending).status, "timeout");
  assert.equal(f.timers.size, 0);
  f.requests[0].success(f.position(80));
  assert.equal(f.timers.size, process.env.HRMS_PERF_BASELINE === "1" ? 1 : 0);
  assert.deepEqual(f.cleared, [42]);
});
test("GPS early success, accuracy refinement, coordinates and fresh-reading options remain intact", async (t) => {
  const f = geolocationFixture(t);
  const first = f.sampleBestPosition({ enableHighAccuracy: true, timeoutMs: 10000, source: "high_accuracy" });
  f.requests[0].success(f.position(25));
  const excellent = await first;
  assert.equal(excellent.status, "captured");
  assert.equal(excellent.latitude, 17.123456789);
  assert.equal(excellent.longitude, 78.987654321);
  assert.equal(excellent.accuracy, 25);
  assert.equal(f.timers.size, 0);
  assert.ok(f.requests.every((request) => request.options.maximumAge === 0 && request.options.enableHighAccuracy));
  const second = f.sampleBestPosition({ enableHighAccuracy: true, timeoutMs: 10000, source: "high_accuracy" });
  f.requests[2].success(f.position(80));
  assert.ok([...f.timers.values()].some((entry) => entry.ms === 2000));
  f.tick(2000);
  assert.equal((await second).accuracy, 80);
  assert.equal(f.timers.size, 0);
});
