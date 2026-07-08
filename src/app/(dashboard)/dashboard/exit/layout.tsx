import { ModuleShell } from "@/components/common/sticky-layout";
import { ExitSubNav } from "@/components/exit/exit-sub-nav";

export default function ExitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<ExitSubNav />}>{children}</ModuleShell>;
}
