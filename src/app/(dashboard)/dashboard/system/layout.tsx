import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminProfile();
  return <>{children}</>;
}
