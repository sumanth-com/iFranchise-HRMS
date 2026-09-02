import type { LeavePolicyDocument, LeavePolicySection } from "@/types/leave-policy";

const PERIOD_LEAVE_PATTERN = /period\s+leave|menstruation\s+leave/i;
const PROBATION_ENTITLEMENT_TITLE =
  /probation[\s-]*(period\s+)?(leave\s+)?entitlement|probation[\s-]*menstruation/i;

function isProbationEntitlementSection(section: LeavePolicySection) {
  return (
    section.id === "probation-entitlement" ||
    PROBATION_ENTITLEMENT_TITLE.test(section.title)
  );
}

function stripPeriodLeaveLines(content: string): string {
  return content
    .split("\n")
    .filter((line) => !PERIOD_LEAVE_PATTERN.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Policy copy without probation entitlement and Period Leave / PL clauses. */
export function hidePeriodLeaveFromPolicyDocument(
  document: LeavePolicyDocument,
): LeavePolicyDocument {
  const sections = document.sections.flatMap((section) => {
    if (isProbationEntitlementSection(section)) return [];
    const content = stripPeriodLeaveLines(section.content);
    if (!content) return [];
    return [{ ...section, content }];
  });

  return { ...document, sections };
}
