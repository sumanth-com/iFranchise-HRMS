import { ModuleShell } from "@/components/common/sticky-layout";
import { CeoApprovalsSubNav } from "@/components/ceo/approvals/ceo-approvals-sub-nav";

export default function CeoApprovalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      header={<CeoApprovalsSubNav />}
      fillContent
      contentClassName="px-0 py-0"
    >
      {children}
    </ModuleShell>
  );
}
