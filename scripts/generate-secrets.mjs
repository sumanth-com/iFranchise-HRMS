/**
 * Generates cryptographically secure secrets for production.
 * Usage: npm run generate:secrets
 *
 * Output is for environment variables only — never commit generated values.
 */
import { randomBytes } from "node:crypto";

function generateSecureSecret(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

const REQUIRED_SECRETS = [
  "ONBOARDING_TOKEN_SECRET",
  "APPROVAL_TOKEN_SECRET",
  "RESET_PASSWORD_TOKEN_SECRET",
  "EMAIL_VERIFICATION_TOKEN_SECRET",
  "PERMISSION_CACHE_SECRET",
  "CRON_SECRET",
];

console.log("# iFranchise HRMS — generated server secrets");
console.log(`# ${new Date().toISOString()}`);
console.log("# Paste into .env.local (local) or Vercel → Settings → Environment Variables");
console.log("# Do NOT commit these values to git.");
console.log("");

for (const key of REQUIRED_SECRETS) {
  console.log(`${key}=${generateSecureSecret()}`);
}
