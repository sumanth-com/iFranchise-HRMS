import { ModuleShell } from "@/components/common/sticky-layout";
import { HiringSubNav } from "@/components/hiring/hiring-sub-nav";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<HiringSubNav />}>{children}</ModuleShell>;
}
