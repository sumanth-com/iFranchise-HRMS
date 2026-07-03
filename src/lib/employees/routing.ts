import type { EmployeeRouteIdentity } from "@/types/employee";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMPLOYEE_CODE_REGEX =
  /^((?:[A-Za-z]{2,}-\d+|[A-Za-z]{2,}\d+))(?:-(.+))?$/;

export type ParsedEmployeeRouteRef =
  | { kind: "legacy-uuid"; value: string }
  | { kind: "employee"; employeeCode: string; slug: string | null };

export function isEmployeeUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function buildEmployeeSlug(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildEmployeeRouteRef(employee: EmployeeRouteIdentity): string {
  const slug = buildEmployeeSlug(employee.firstName, employee.lastName);

  if (!slug) {
    return employee.employeeCode;
  }

  return `${employee.employeeCode}-${slug}`;
}

export function parseEmployeeRouteRef(routeRef: string): ParsedEmployeeRouteRef {
  if (isEmployeeUuid(routeRef)) {
    return { kind: "legacy-uuid", value: routeRef };
  }

  const match = routeRef.match(EMPLOYEE_CODE_REGEX);
  if (match) {
    return {
      kind: "employee",
      employeeCode: match[1],
      slug: match[2] ?? null,
    };
  }

  if (!routeRef.includes("-")) {
    return { kind: "employee", employeeCode: routeRef, slug: null };
  }

  const parts = routeRef.split("-");
  return {
    kind: "employee",
    employeeCode: parts[0],
    slug: parts.slice(1).join("-") || null,
  };
}

export function buildEmployeeCodeCandidates(routeRef: string): string[] {
  const parsed = parseEmployeeRouteRef(routeRef);

  if (parsed.kind === "legacy-uuid") {
    return [];
  }

  if (!routeRef.includes("-")) {
    return [parsed.employeeCode];
  }

  const parts = routeRef.split("-");
  const candidates: string[] = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    candidates.push(parts.slice(0, index + 1).join("-"));
  }

  if (!candidates.includes(parsed.employeeCode)) {
    candidates.push(parsed.employeeCode);
  }

  return [...new Set(candidates)].sort(
    (left, right) => right.length - left.length,
  );
}

export function formatEmployeeRouteRefLabel(routeRef: string): string {
  const parsed = parseEmployeeRouteRef(routeRef);

  if (parsed.kind === "legacy-uuid") {
    return "Employee";
  }

  if (parsed.slug) {
    return parsed.slug
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return parsed.employeeCode;
}

export function isEmployeeDetailRouteSegment(segment: string): boolean {
  return segment !== "new" && segment !== "employees";
}
