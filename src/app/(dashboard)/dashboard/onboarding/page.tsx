import { redirect } from "next/navigation";

import { ONBOARDING_ROUTES } from "@/types/onboarding";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingLegacyListRedirect({ searchParams }: PageProps) {
  const raw = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(query ? `${ONBOARDING_ROUTES.hrList}?${query}` : ONBOARDING_ROUTES.hrList);
}
