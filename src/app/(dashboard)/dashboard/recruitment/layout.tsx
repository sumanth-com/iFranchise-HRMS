import { ModuleShell } from "@/components/common/sticky-layout";
import { HiringSubNav } from "@/components/hiring/hiring-sub-nav";

export default function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      header={<HiringSubNav />}
      contentClassName="pt-3 pb-3 [&>div]:gap-3"
    >
      {children}
    </ModuleShell>
  );
}
