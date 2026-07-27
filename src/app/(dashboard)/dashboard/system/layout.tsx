import { PageScroll } from "@/components/common/sticky-layout";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminProfile();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageScroll className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
        {children}
      </PageScroll>
    </div>
  );
}
