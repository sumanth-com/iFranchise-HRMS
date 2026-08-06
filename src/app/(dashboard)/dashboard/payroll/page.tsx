import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { PayrollHubSection } from "@/lib/dashboard/self-service/payroll-hub-section";
import { SELF_PAYROLL_ROUTES } from "@/lib/payroll/constants";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollSelfServicePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_PAYROLL_ROUTES.list, raw, {
    teamSubPathFromSection: true,
  });
  if (legacy) redirect(legacy);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <PayrollHubSection section="my" searchParams={searchParams} />
    </Suspense>
  );
}
