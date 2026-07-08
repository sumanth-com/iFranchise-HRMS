import { ModuleShell } from "@/components/common/sticky-layout";
import { DocumentsSubNav } from "@/components/documents/documents-sub-nav";

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<DocumentsSubNav />}>{children}</ModuleShell>;
}
