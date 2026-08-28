/**
 * Executive approval actions bubble raw Supabase/Postgres messages (row-level
 * security violations, constraint names, PostgREST codes) straight into toasts.
 * Business rule messages raised by our own code stay visible; infrastructure
 * details are logged server-side and replaced with a clean message.
 */
const TECHNICAL_ERROR_PATTERNS: RegExp[] = [
  /row-level security/i,
  /violates .*constraint/i,
  /permission denied/i,
  /duplicate key value/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /invalid input syntax/i,
  /syntax error/i,
  /\bPGRST\d+\b/,
  /\bJWT\b/,
  /supabase/i,
  /postgres/i,
  /fetch failed/i,
];

function isTechnicalMessage(message: string) {
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function toCeoApprovalErrorMessage(
  context: string,
  error: unknown,
  fallback: string,
): string {
  console.error(`[ceo-approvals] ${context} failed`, error);

  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  return isTechnicalMessage(error.message) ? fallback : error.message;
}
