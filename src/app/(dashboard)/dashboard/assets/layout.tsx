import { ModuleShell } from "@/components/common/sticky-layout";
import { AssetsSubNav } from "@/components/assets/assets-sub-nav";

export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<AssetsSubNav />}>{children}</ModuleShell>;
}
