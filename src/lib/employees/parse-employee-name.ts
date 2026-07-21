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
