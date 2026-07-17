export const APPROVAL_ROUTE_BASE = "/approval";

/** Default single-use link lifetime (hours). Overridable via env. */
export function getApprovalTokenTtlHours(): number {
  const raw = Number.parseInt(process.env.APPROVAL_TOKEN_TTL_HOURS ?? "", 10);
  if (Number.isFinite(raw) && raw > 0 && raw <= 168) return raw;
  return 48;
}

export function approvalActionUrl(rawToken: string, action: "approve" | "reject" | "view"): string {
  return `${APPROVAL_ROUTE_BASE}/${encodeURIComponent(rawToken)}?action=${action}`;
}
