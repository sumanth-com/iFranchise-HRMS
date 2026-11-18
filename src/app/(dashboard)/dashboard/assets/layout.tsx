import { PageScroll } from "@/components/common/sticky-layout";
import { redirectSuperAdminToSystemPortal } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default async function AssetsSelfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectSuperAdminToSystemPortal(SYSTEM_ADMIN_ROUTES.assets);
  return <PageScroll>{children}</PageScroll>;
}
