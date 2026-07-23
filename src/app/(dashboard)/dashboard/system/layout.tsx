import { PageScroll } from "@/components/common/sticky-layout";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminProfile();

  return <PageScroll>{children}</PageScroll>;
}
