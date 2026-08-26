import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isChunkLoadError,
  isDeploymentSkewError,
  isRecoverableRouteError,
  isStaleHmrModuleError,
} from "./chunk-load-recovery";

describe("chunk-load-recovery classification", () => {
  it("recognizes ChunkLoadError and dynamic import failures", () => {
    assert.equal(isChunkLoadError(new Error("Loading chunk 123 failed")), true);
    assert.equal(
      isChunkLoadError(new Error("Failed to fetch dynamically imported module")),
      true,
    );
    const named = new Error("x");
    named.name = "ChunkLoadError";
    assert.equal(isChunkLoadError(named), true);
  });

  it("recognizes deployment / Server Action / RSC skew", () => {
    assert.equal(
      isDeploymentSkewError(new Error("Failed to find Server Action `abc`")),
      true,
    );
    assert.equal(
      isDeploymentSkewError(
        new Error("The deployment has been updated. Please refresh for newer or older deployment."),
      ),
      true,
    );
    assert.equal(
      isDeploymentSkewError(new Error("Failed to fetch RSC payload for /employee/leave")),
      true,
    );
  });

  it("does NOT treat aborted / cancelled navigation as recoverable", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    assert.equal(isRecoverableRouteError(abort), false);
    assert.equal(isRecoverableRouteError(new Error("Failed to fetch")), false);
    assert.equal(isRecoverableRouteError(new Error("NetworkError when attempting to fetch resource.")), false);
    assert.equal(isRecoverableRouteError(new Error("Load failed")), false);
  });

  it("does NOT treat application logic errors as recoverable", () => {
    assert.equal(
      isRecoverableRouteError(new Error("Cannot read properties of null (reading 'map')")),
      false,
    );
    assert.equal(isRecoverableRouteError(new Error("Use of aggregate functions is not allowed")), false);
    assert.equal(isStaleHmrModuleError(new Error("TypeError: x is not a function")), false);
  });

  it("isRecoverableRouteError unions chunk + HMR + deploy skew only", () => {
    assert.equal(isRecoverableRouteError(new Error("Loading chunk app failed")), true);
    assert.equal(
      isRecoverableRouteError(new Error("module factory is not available")),
      true,
    );
    assert.equal(isRecoverableRouteError(new Error("boom")), false);
  });
});
