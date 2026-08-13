import { ModuleShell } from "@/components/common/sticky-layout";
import { HiringSubNav } from "@/components/hiring/hiring-sub-nav";
import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoRecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      header={<HiringSubNav basePath={CEO_ROUTES.recruitment} />}
      contentClassName="pt-3 pb-3 [&>div]:gap-3 [&>div]:min-h-0"
    >
      {children}
    </ModuleShell>
  );
}
