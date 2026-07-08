import { ModuleShell } from "@/components/common/sticky-layout";
import { RecruitmentSubNav } from "@/components/recruitment/recruitment-sub-nav";

export default function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<RecruitmentSubNav />}>{children}</ModuleShell>;
}
