/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the route with controlled authentication. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

const filename = require.resolve("../../src/app/api/session/activity/route.ts");
function fixture(touch) {
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (name) => name === "@/lib/auth/actions"
    ? { touchSessionActivityAction: touch }
    : require(name);
  loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports.POST;
}

test("same-origin endpoint invokes the existing authenticated action once and returns no page data", async () => {
  let calls = 0;
  const post = fixture(async () => { calls++; });
  const response = await post(new Request("http://localhost:3000/api/session/activity", {
    method: "POST", headers: { origin: "http://localhost:3000" },
  }));
  assert.equal(calls, 1);
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("cross-origin, missing-origin and null-origin calls cannot invoke the action", async () => {
  let calls = 0;
  const post = fixture(async () => { calls++; });
  for (const origin of ["https://evil.invalid", "null", undefined]) {
    const response = await post(new Request("https://hrms.ifranchise.in/api/session/activity", {
      method: "POST", headers: origin ? { origin } : {},
    }));
    assert.equal(response.status, 403);
  }
  assert.equal(calls, 0);
});

test("existing auth errors are not converted into successful responses", async () => {
  const error = new Error("auth unavailable");
  const post = fixture(async () => { throw error; });
  await assert.rejects(post(new Request("https://hrms.ifranchise.in/api/session/activity", {
    method: "POST", headers: { origin: "https://hrms.ifranchise.in" },
  })), (value) => value === error);
});
