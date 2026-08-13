import { PageScroll } from "@/components/common/sticky-layout";

export default function SystemAdminModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageScroll className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
        {children}
      </PageScroll>
    </div>
  );
}
