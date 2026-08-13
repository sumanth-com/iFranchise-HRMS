import { ModuleShell } from "@/components/common/sticky-layout";
import { HiringSubNav } from "@/components/hiring/hiring-sub-nav";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { RECRUITMENT_SUB_NAV } from "@/lib/recruitment/constants";

export default function ManagerRecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      header={
        <HiringSubNav
          basePath={MANAGER_ROUTES.recruitment}
          items={RECRUITMENT_SUB_NAV}
        />
      }
      contentClassName="pt-3 pb-3 [&>div]:gap-3 [&>div]:min-h-0"
    >
      {children}
    </ModuleShell>
  );
}
