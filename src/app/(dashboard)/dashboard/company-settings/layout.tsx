import { PageScroll } from "@/components/common/sticky-layout";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function CompanySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireServerAnyPermission(["settings.view"]);

  return <PageScroll>{children}</PageScroll>;
}
