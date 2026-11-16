import assert from "node:assert/strict";
import { test } from "node:test";
import { deduplicateInFlight } from "./in-flight-request";

test("dialog/form/effect replay share one unfinished request, then fetch fresh data", async () => {
  let calls = 0;
  let release!: (value: number) => void;
  const load = deduplicateInFlight(async () => {
    calls++;
    return new Promise<number>((resolve) => { release = resolve; });
  });
  const first = load("employee-a");
  assert.equal(load("employee-a"), first);
  assert.equal(load("employee-a"), first);
  await Promise.resolve();
  assert.equal(calls, 1);
  release(1);
  assert.equal(await first, 1);
  const fresh = load("employee-a");
  assert.notEqual(first, fresh);
  await Promise.resolve();
  release(2);
  assert.equal(await fresh, 2);
  assert.equal(calls, 2);
});

test("different employees and component owners never share a request", async () => {
  const load = deduplicateInFlight(async (id: string) => id);
  const other = deduplicateInFlight(async (id: string) => id);
  const a = load("employee-a"), b = load("employee-b"), c = other("employee-a");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.deepEqual(await Promise.all([a, b, c]), ["employee-a", "employee-b", "employee-a"]);
});

test("server failures and thrown errors are preserved and retryable", async () => {
  let calls = 0;
  const error = new Error("network failure");
  const load = deduplicateInFlight(async () => {
    calls++;
    if (calls === 1) throw error;
    return { success: false, message: "Permission denied" };
  });
  const first = load("employee-a");
  assert.equal(load("employee-a"), first);
  await assert.rejects(first, (value) => value === error);
  assert.deepEqual(await load("employee-a"), { success: false, message: "Permission denied" });
  assert.equal(calls, 2);
});
