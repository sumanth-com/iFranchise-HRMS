export function parseEmployeeFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "Employee", lastName: "User" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Employee" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function getEmployeeGreetingName(
  firstName: string,
  lastName: string,
): string {
  const first = firstName.trim();
  if (first) return first;
  const last = lastName.trim();
  return last || "there";
}

/** Preferred short name for Daily Boost (e.g. Gangaram Sumanth → Sumanth). */
export function getDailyBoostDisplayName(firstName: string, lastName = ""): string {
  const firstParts = firstName.trim().split(/\s+/).filter(Boolean);
  if (firstParts.length > 1) {
    return firstParts[firstParts.length - 1]!;
  }

  const lastParts = lastName.trim().split(/\s+/).filter(Boolean);
  if (lastParts.length >= 1) {
    return lastParts[0]!;
  }

  return firstParts[0] ?? "there";
}
