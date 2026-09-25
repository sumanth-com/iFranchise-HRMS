/**
 * Concurrent soft-load probe for HRMS portals.
 *
 * Measures p50/p95 latency and error rate against a running deployment.
 * Does NOT auto-scale Supabase compute — results are for capacity decisions.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 CONCURRENCY=10 \
 *     node scripts/perf/concurrent-portal-probe.mjs
 *
 * Optional:
 *   CONCURRENCY=25|50
 *   ROUTES=/ceo,/ceo/documents,/employee,/employee/documents,/employee/payroll,/employee/attendance
 *   WARMUP=1
 *   COOKIE="sb-access-token=...; sb-refresh-token=..."  (authenticated runs)
 */

import { performance } from "node:perf_hooks";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 10));
const WARMUP = process.env.WARMUP !== "0";
const COOKIE = process.env.COOKIE || "";
const ROUTES = (
  process.env.ROUTES ||
  "/ceo,/ceo/employees,/employee,/employee/documents,/employee/payroll,/employee/attendance"
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function hit(path) {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: COOKIE ? { cookie: COOKIE } : undefined,
      redirect: "manual",
    });
    const ms = performance.now() - started;
    return {
      path,
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      ms,
    };
  } catch (error) {
    return {
      path,
      ok: false,
      status: 0,
      ms: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runWave(label, concurrency) {
  const jobs = [];
  for (let i = 0; i < concurrency; i += 1) {
    const path = ROUTES[i % ROUTES.length];
    jobs.push(hit(path));
  }
  const results = await Promise.all(jobs);
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const errors = results.filter((r) => !r.ok);
  const byPath = new Map();
  for (const r of results) {
    const bucket = byPath.get(r.path) || { count: 0, ms: [], errors: 0 };
    bucket.count += 1;
    bucket.ms.push(r.ms);
    if (!r.ok) bucket.errors += 1;
    byPath.set(r.path, bucket);
  }

  console.log(`\n=== ${label} (concurrency=${concurrency}) ===`);
  console.log(
    `requests=${results.length} errors=${errors.length} errorRate=${(
      (errors.length / results.length) *
      100
    ).toFixed(1)}%`,
  );
  console.log(
    `latency ms: p50=${percentile(times, 50).toFixed(0)} p95=${percentile(times, 95).toFixed(0)} max=${times[times.length - 1]?.toFixed(0) ?? 0}`,
  );
  for (const [path, bucket] of byPath) {
    const sorted = bucket.ms.sort((a, b) => a - b);
    console.log(
      `  ${path}: n=${bucket.count} p50=${percentile(sorted, 50).toFixed(0)} p95=${percentile(sorted, 95).toFixed(0)} errors=${bucket.errors}`,
    );
  }
  return { results, errors, times };
}

async function main() {
  console.log(`Probe target: ${BASE_URL}`);
  console.log(`Routes: ${ROUTES.join(" ")}`);
  console.log(`Auth cookie: ${COOKIE ? "provided" : "none (expect redirects on protected routes)"}`);

  if (WARMUP) {
    await runWave("warmup", Math.min(3, CONCURRENCY));
  }

  await runWave(`load-${CONCURRENCY}`, CONCURRENCY);

  if (CONCURRENCY < 25) {
    console.log("\nTip: re-run with CONCURRENCY=25 and CONCURRENCY=50 for the full matrix.");
  }
  console.log(
    "\nNote: This probes HTTP latency only. Pair with Supabase dashboard CPU/RAM/connections and Chrome Performance for LCP/duplicate requests.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
