import { buildEmployeeSlug, isEmployeeUuid } from "@/lib/employees/routing";

export type OnboardingRouteIdentity = {
  id: string;
  fullName: string;
};

export function isOnboardingCaseUuid(value: string): boolean {
  return isEmployeeUuid(value);
}

export function buildOnboardingSlug(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");

  return buildEmployeeSlug(firstName, lastName);
}

/** Assigns readable URL segments (e.g. `sumanth`, `sumanth-2`) per case. */
export function assignOnboardingRouteRefs(
  cases: OnboardingRouteIdentity[],
): Map<string, string> {
  const slugBuckets = new Map<string, string[]>();

  for (const row of cases) {
    const slug = buildOnboardingSlug(row.fullName) || row.id;
    const bucket = slugBuckets.get(slug) ?? [];
    bucket.push(row.id);
    slugBuckets.set(slug, bucket);
  }

  const routeRefs = new Map<string, string>();

  for (const [slug, ids] of slugBuckets) {
    if (ids.length === 1) {
      routeRefs.set(ids[0], slug);
      continue;
    }

    ids.forEach((id, index) => {
      routeRefs.set(id, index === 0 ? slug : `${slug}-${index + 1}`);
    });
  }

  return routeRefs;
}

export function onboardingRouteRefForCase(
  caseId: string,
  fullName: string,
  peers: OnboardingRouteIdentity[] = [],
): string {
  const cases = [...peers];
  if (!cases.some((row) => row.id === caseId)) {
    cases.push({ id: caseId, fullName });
  }
  return assignOnboardingRouteRefs(cases).get(caseId) ?? caseId;
}

export function resolveOnboardingCaseIdFromRouteRef(
  routeRef: string,
  cases: OnboardingRouteIdentity[],
): string | null {
  if (isOnboardingCaseUuid(routeRef)) {
    return cases.find((row) => row.id === routeRef)?.id ?? null;
  }

  const routeRefs = assignOnboardingRouteRefs(cases);
  for (const [id, ref] of routeRefs) {
    if (ref === routeRef) return id;
  }

  return null;
}
