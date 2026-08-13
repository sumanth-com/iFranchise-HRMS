import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hasPermission } from "@/lib/permissions/utils";

export const EMERGENCY_RELATIONSHIP_OPTIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "cousin", label: "Cousin" },
  { value: "friend", label: "Friend" },
  { value: "spouse", label: "Spouse" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
] as const;

export type EmergencyRelationshipValue =
  (typeof EMERGENCY_RELATIONSHIP_OPTIONS)[number]["value"];

export type ProfileAddressParts = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function formatFullAddress(address: ProfileAddressParts): string {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "";
}

export function parseFullAddress(
  fullAddress: string,
  fallback: ProfileAddressParts,
): ProfileAddressParts {
  const trimmed = fullAddress.trim();
  if (!trimmed) {
    return {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: fallback.country || "IN",
    };
  }

  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  let country = fallback.country || "IN";
  let postalCode = "";
  let state = "";
  let city = "";
  const lineParts = [...parts];

  if (lineParts.length > 0 && /^[A-Z]{2}$/i.test(lineParts[lineParts.length - 1])) {
    country = lineParts.pop()!.toUpperCase();
  }

  if (lineParts.length > 0 && /^\d{4,10}$/.test(lineParts[lineParts.length - 1])) {
    postalCode = lineParts.pop()!;
  }

  if (lineParts.length > 0) {
    state = lineParts.pop()!;
  }

  if (lineParts.length > 0) {
    city = lineParts.pop()!;
  }

  const addressLine1 = lineParts.join(", ") || city || trimmed;

  return {
    addressLine1,
    addressLine2: "",
    city,
    state,
    postalCode,
    country,
  };
}

export function formatRelationshipLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const normalized = value.trim().toLowerCase();
  const match = EMERGENCY_RELATIONSHIP_OPTIONS.find(
    (option) =>
      option.value === normalized || option.label.toLowerCase() === normalized,
  );
  return match?.label ?? value;
}

export function normalizeRelationshipValue(
  value: string | null | undefined,
): EmergencyRelationshipValue | "" {
  if (!value?.trim()) return "";
  const normalized = value.trim().toLowerCase();
  const match = EMERGENCY_RELATIONSHIP_OPTIONS.find(
    (option) =>
      option.value === normalized || option.label.toLowerCase() === normalized,
  );
  return match?.value ?? "other";
}

export function canEditSelfProfileContactDetails(permissionCodes: string[]): boolean {
  return (
    hasPermission(permissionCodes, "employee.edit") ||
    hasPermission(permissionCodes, "employee_profile.edit") ||
    hasPermission(permissionCodes, PORTAL_PERMISSIONS.manager) ||
    hasPermission(permissionCodes, PORTAL_PERMISSIONS.ceo)
  );
}
