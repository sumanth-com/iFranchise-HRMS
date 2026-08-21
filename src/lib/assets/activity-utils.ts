import type { AssetActivityKind } from "@/types/assets";

export type EmployeeRequestKind = "report" | "replace" | "status" | "return";

export type ActivityFilterType = "all" | EmployeeRequestKind;

const REPORT_PREFIX = "Issue reported (";
const STATUS_PREFIX = "Status reported:";
const RETURN_PREFIX = "Return request:";
const REPLACE_SUFFIX = " requested:";

function plainLatinI(value: string) {
  return value.replace(/[İıĪī]/g, "i");
}

export function classifyMaintenanceIssue(issue: string): AssetActivityKind {
  const trimmed = issue.trim();
  if (trimmed.startsWith(REPORT_PREFIX)) return "issue_reported";
  if (trimmed.startsWith(STATUS_PREFIX)) return "status_reported";
  // Must run before REPLACE_SUFFIX — "Return request:" must not match replacement.
  if (trimmed.startsWith(RETURN_PREFIX)) return "return_requested";
  if (trimmed.includes(REPLACE_SUFFIX)) return "replacement_requested";
  return "maintenance_opened";
}

export function classifyEmployeeRequestKind(issue: string): EmployeeRequestKind | null {
  const kind = classifyMaintenanceIssue(issue);
  if (kind === "issue_reported") return "report";
  if (kind === "replacement_requested") return "replace";
  if (kind === "status_reported") return "status";
  if (kind === "return_requested") return "return";
  return null;
}

export function maintenanceActivityLabel(kind: AssetActivityKind, issue: string): string {
  switch (kind) {
    case "issue_reported":
      return "Issue reported";
    case "replacement_requested": {
      const type = issue.split(" requested:")[0]?.trim();
      return type ? `${type} requested` : "Replacement requested";
    }
    case "status_reported":
      return "Status reported";
    case "return_requested":
      return "Return requested";
    case "maintenance_completed":
      return "Maintenance completed";
    default:
      return "Marked under maintenance";
  }
}

export function maintenanceIssueFilter(type: ActivityFilterType): string | null {
  switch (type) {
    case "report":
      return `${REPORT_PREFIX}%`;
    case "replace":
      return `%${REPLACE_SUFFIX}%`;
    case "status":
      return `${STATUS_PREFIX}%`;
    case "return":
      return `${RETURN_PREFIX}%`;
    default:
      return null;
  }
}

export function parsePerformerFromMaintenanceNotes(notes: string | null): string | null {
  if (!notes?.trim()) return null;
  const raised = notes.match(/Raised by (.+?)(?: ·|$)/);
  if (raised?.[1]) return plainLatinI(raised[1].trim());
  const reported = notes.match(/Reported by (.+?) for /);
  if (reported?.[1]) return plainLatinI(reported[1].trim());
  const request = notes.match(/Employee request \(.+?\) by (.+?)$/);
  if (request?.[1]) return plainLatinI(request[1].trim());
  const returnBy = notes.match(/Return request by (.+)$/);
  if (returnBy?.[1]) return plainLatinI(returnBy[1].trim());
  return null;
}

export function parseEmployeeRequestDetails(issue: string, notes?: string | null) {
  const trimmed = issue.trim();
  const report = trimmed.match(/^Issue reported \((.+?)\):\s*([\s\S]+)$/);
  if (report) {
    return {
      kind: "report" as const,
      typeLabel: report[1],
      message: report[2].trim(),
      severity: notes?.match(/Severity:\s*([^·]+)/)?.[1]?.trim() ?? null,
    };
  }

  const status = trimmed.match(/^Status reported:\s*([\s\S]+)$/);
  if (status) {
    const extra = status[1].includes(" — ") ? status[1].split(" — ").slice(1).join(" — ").trim() : null;
    return {
      kind: "status" as const,
      typeLabel: "Status",
      message: extra || status[1].trim(),
      severity: null,
    };
  }

  const returnReq = trimmed.match(/^Return request:\s*([\s\S]+)$/);
  if (returnReq) {
    const body = returnReq[1].trim();
    const [datePart, ...noteParts] = body.split(" — ");
    return {
      kind: "return" as const,
      typeLabel: "Return",
      message: noteParts.length > 0 ? noteParts.join(" — ").trim() : "",
      severity: null,
      returnDate: datePart?.trim() || null,
    };
  }

  const replace = trimmed.match(/^(.+?) requested:\s*([\s\S]+)$/);
  if (replace) {
    return {
      kind: "replace" as const,
      typeLabel: replace[1],
      message: replace[2].trim(),
      severity: null,
    };
  }

  return {
    kind: null,
    typeLabel: null,
    message: trimmed,
    severity: notes?.trim() || null,
  };
}

export function employeeRequestLabel(kind: EmployeeRequestKind): string {
  switch (kind) {
    case "report":
      return "Issue report";
    case "replace":
      return "Replacement request";
    case "status":
      return "Status update";
    case "return":
      return "Return request";
  }
}

export function formatReturnRequestIssue(returnDate: string, notes?: string | null) {
  const note = notes?.trim();
  return note ? `${RETURN_PREFIX} ${returnDate} — ${note}` : `${RETURN_PREFIX} ${returnDate}`;
}
