/**
 * Verifies required environment variables in .env and .env.local.
 * Usage: npm run check:env
 */
import fs from "node:fs";

const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ONBOARDING_TOKEN_SECRET",
  "APPROVAL_TOKEN_SECRET",
  "RESET_PASSWORD_TOKEN_SECRET",
  "EMAIL_VERIFICATION_TOKEN_SECRET",
  "PERMISSION_CACHE_SECRET",
  "CRON_SECRET",
];

const EMAIL_REQUIRED = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"];

function parseEnvFile(path) {
  const out = {};
  if (!fs.existsSync(path)) return out;
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const merged = {
  ...parseEnvFile(".env"),
  ...parseEnvFile(".env.local"),
};

let missing = 0;

console.log("iFranchise HRMS — environment check\n");

for (const key of REQUIRED) {
  const ok = Boolean(merged[key]?.trim());
  console.log(`${ok ? "✓" : "✗"} ${key}`);
  if (!ok) missing += 1;
}

console.log("\nEmail delivery (required for onboarding invitations):\n");

for (const key of EMAIL_REQUIRED) {
  const ok = Boolean(merged[key]?.trim());
  console.log(`${ok ? "✓" : "✗"} ${key}`);
  if (!ok) missing += 1;
}

if (missing > 0) {
  console.log(
    `\n${missing} variable(s) missing locally. Copy values to Vercel → Settings → Environment Variables for Production, then redeploy.`,
  );
  process.exit(1);
}

console.log("\nAll required variables are set locally.");
console.log("For production, mirror the same keys in Vercel and redeploy after changes.");
