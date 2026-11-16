import assert from "node:assert/strict";
import { test } from "node:test";

import { reverseGeocodeAttendanceAddress } from "./attendance-reverse-geocode";

test("overlapping address lookups share one request for the same attendance point", async (t) => {
  let release!: (response: Response) => void;
  const response = new Promise<Response>((resolve) => { release = resolve; });
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("lat"), "12.123456789");
    assert.equal(url.searchParams.get("lon"), "77.123456789");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    return response;
  });

  const requests = Array.from({ length: 3 }, () =>
    reverseGeocodeAttendanceAddress(12.123456789, 77.123456789, "record-a:check_in"),
  );
  assert.equal(fetchMock.mock.callCount(), 1);
  release(new Response(JSON.stringify({ display_name: "  Fixture address  " })));
  assert.deepEqual(await Promise.all(requests), Array(3).fill("Fixture address"));
});

test("address lookups do not cache settled results or merge different records, points, or coordinates", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    new Response(JSON.stringify({ display_name: "Fixture address" })),
  );
  await Promise.all([
    reverseGeocodeAttendanceAddress(12, 77, "record-a:check_in"),
    reverseGeocodeAttendanceAddress(12, 77, "record-b:check_in"),
    reverseGeocodeAttendanceAddress(12, 77, "record-a:check_out"),
    reverseGeocodeAttendanceAddress(12.000000001, 77, "record-a:check_in"),
  ]);
  assert.equal(fetchMock.mock.callCount(), 4);
  await reverseGeocodeAttendanceAddress(12, 77, "record-a:check_in");
  assert.equal(fetchMock.mock.callCount(), 5);
});

test("failed address lookups retain null fallback and can be retried", async (t) => {
  let failure = true;
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    if (failure) throw new DOMException("Timed out", "TimeoutError");
    return new Response(JSON.stringify({ display_name: "Recovered address" }));
  });
  assert.deepEqual(await Promise.all([
    reverseGeocodeAttendanceAddress(12, 77, "record-a:check_in"),
    reverseGeocodeAttendanceAddress(12, 77, "record-a:check_in"),
  ]), [null, null]);
  assert.equal(fetchMock.mock.callCount(), 1);
  failure = false;
  assert.equal(await reverseGeocodeAttendanceAddress(12, 77, "record-a:check_in"), "Recovered address");
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("invalid coordinates never make a request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected request");
  });
  for (const [latitude, longitude] of [[NaN, 77], [12, Infinity], [91, 77], [12, -181]]) {
    assert.equal(await reverseGeocodeAttendanceAddress(latitude, longitude, "record-a:check_in"), null);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("provider errors, malformed JSON, and missing addresses keep the original null result", async (t) => {
  const responses = [
    new Response("Unavailable", { status: 503 }),
    new Response("not JSON"),
    new Response(JSON.stringify({})),
    new Response(JSON.stringify({ display_name: "  " })),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  for (let i = 0; i < 4; i++) {
    assert.equal(await reverseGeocodeAttendanceAddress(12, 77, "record-a:check_in"), null);
  }
});
