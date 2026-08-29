import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerTeamView } from "@/components/manager/team/manager-team-view";
import { getManagerTeamPageData } from "@/lib/manager/actions/team-actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { teamListParamsSchema } from "@/lib/validations/manager-team";

type ManagerTeamPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

async function ManagerTeamContent({ searchParams }: ManagerTeamPageProps) {
  await requireServerPermission("portal.manager.access");
  const rawParams = await searchParams;

  const data = await getManagerTeamPageData(
    teamListParamsSchema.parse({
      page: firstString(rawParams.page),
      pageSize: firstString(rawParams.pageSize),
    }),
  );

  return <ManagerTeamView {...data} />;
}

export default function ManagerTeamPage(props: ManagerTeamPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerTeamContent {...props} />
    </Suspense>
  );
}
