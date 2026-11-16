import assert from "node:assert/strict";
import { test } from "node:test";
import { createIntentPrefetch } from "./intent-prefetch";

test("passing across links does not fetch unvisited modules", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const paths: string[] = [];
  const intent = createIntentPrefetch((path) => paths.push(path));
  intent.hover("/overview");
  t.mock.timers.tick(50);
  intent.cancel();
  intent.hover("/security");
  t.mock.timers.tick(119);
  assert.deepEqual(paths, []);
  t.mock.timers.tick(1);
  assert.deepEqual(paths, ["/security"]);
});

test("pointer and mouse events share a hover timer, while a press starts immediately", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const paths: string[] = [];
  const intent = createIntentPrefetch((path) => paths.push(path));
  intent.hover("/attendance");
  t.mock.timers.tick(100);
  intent.hover("/attendance");
  t.mock.timers.tick(20);
  assert.deepEqual(paths, ["/attendance"]);
  intent.hover("/payroll");
  intent.press("/payroll");
  assert.deepEqual(paths, ["/attendance", "/payroll"]);
  t.mock.timers.tick(1000);
  assert.deepEqual(paths, ["/attendance", "/payroll"]);
});

test("leaving or unmounting cancels work and component instances remain independent", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const paths: string[] = [];
  const first = createIntentPrefetch((path) => paths.push(path));
  const second = createIntentPrefetch((path) => paths.push(path));
  first.hover("/first");
  second.hover("/second");
  first.cancel();
  t.mock.timers.tick(120);
  assert.deepEqual(paths, ["/second"]);
});
