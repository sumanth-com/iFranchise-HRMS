import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand/constants";
import { getOrganizationProfile } from "@/lib/organization/services/org-queries";
import { getPayrollSettings } from "@/lib/payroll/services/payroll-settings";
import type { OrganizationProfile } from "@/types/organization";

export type PayslipBranding = {
  companyName: string;
  addressLines: string[];
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  footerMessage: string;
  currencyCode: string;
  gstNumber: string | null;
  cin: string | null;
};

const DEFAULT_ADDRESS = [
  "No 51, Devarabisanahalli",
  "Bangalore, Karnataka - 560103",
  "India",
];

function pickAddressField(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function normalizeCountryLabel(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^in$/i.test(trimmed) ? "India" : trimmed;
}

function formatStatePostalSegment(state: string | null, postal: string | null): string | null {
  if (state && postal) return `${state} - ${postal}`;
  return state ?? postal;
}

export function formatPayslipDisplayAddress(lines: string[]): string[] {
  const parts = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (/^in$/i.test(line) ? "India" : line));

  if (parts.length === 0) return [];
  if (parts.length === 1) return parts;

  const country = parts.find((part) => /^india$/i.test(part));
  const body = country ? parts.filter((part) => part !== country) : [...parts];
  const street = body[0] ?? "";
  const streetLower = street.toLowerCase();

  const localitySegments: string[] = [];
  for (const part of body.slice(1)) {
    for (const segment of part.split(",").map((value) => value.trim()).filter(Boolean)) {
      const segmentLower = segment.toLowerCase();
      if (segmentLower.length > 4 && streetLower.includes(segmentLower)) continue;
      if (localitySegments.some((existing) => existing.toLowerCase() === segmentLower)) continue;
      localitySegments.push(segment);
    }
  }

  const pinIndex = localitySegments.findIndex((segment) => /^\d{6}$/.test(segment));
  if (pinIndex > 0) {
    const state = localitySegments[pinIndex - 1];
    const postal = localitySegments[pinIndex];
    localitySegments.splice(pinIndex - 1, 2, `${state} - ${postal}`);
  }

  const locality = [localitySegments.join(", "), country].filter(Boolean).join(", ");
  return locality ? [street, locality] : [street];
}

export function normalizeAddressLines(lines: string[]): string[] {
  return formatPayslipDisplayAddress(lines);
}

export function formatOrganizationAddress(profile: OrganizationProfile | null): string[] {
  if (!profile) return DEFAULT_ADDRESS;

  const line1 = pickAddressField(
    profile.corporateAddressLine1,
    profile.registeredAddressLine1,
  );
  const line2 = pickAddressField(
    profile.corporateAddressLine2,
    profile.registeredAddressLine2,
  );
  const cityLine =
    formatStatePostalSegment(
      pickAddressField(profile.corporateState, profile.registeredState),
      pickAddressField(profile.corporatePostalCode, profile.registeredPostalCode),
    ) ??
    pickAddressField(profile.corporateCity, profile.registeredCity);
  const country = normalizeCountryLabel(
    pickAddressField(profile.corporateCountry, profile.registeredCountry),
  );

  const lines = [line1, line2, cityLine, country].filter(
    (line): line is string => Boolean(line && line.trim()),
  );

  return lines.length > 0 ? lines : DEFAULT_ADDRESS;
}

export async function getPayslipBranding(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<PayslipBranding> {
  const [orgProfile, payrollSettings] = await Promise.all([
    getOrganizationProfile(supabase, organizationId),
    getPayrollSettings(supabase, organizationId),
  ]);

  const payrollConfig = payrollSettings.settings;

  let logoUrl: string | null = DEFAULT_BRAND_LOGO_PATH;

  if (orgProfile?.logoStoragePath) {
    try {
      const { createSignedStorageUrl } = await import(
        "@/lib/employees/services/employee-mutations"
      );
      logoUrl = await createSignedStorageUrl(
        supabase,
        "company-assets",
        orgProfile.logoStoragePath,
      );
    } catch {
      logoUrl = DEFAULT_BRAND_LOGO_PATH;
    }
  } else if (payrollConfig.payslip.companyLogoPath) {
    logoUrl = payrollConfig.payslip.companyLogoPath;
  }

  return {
    companyName:
      payrollConfig.payslip.companyName ||
      orgProfile?.legalName ||
      orgProfile?.name ||
      "iFranchise",
    addressLines: formatOrganizationAddress(orgProfile),
    logoUrl,
    email: orgProfile?.email ?? null,
    phone: orgProfile?.phone ?? null,
    footerMessage:
      payrollConfig.payslip.footerMessage ||
      "This is a system-generated salary statement and does not require a physical signature.",
    currencyCode: payrollConfig.currency || orgProfile?.currencyCode || "INR",
    gstNumber: orgProfile?.gstNumber ?? null,
    cin: orgProfile?.cin ?? null,
  };
}
