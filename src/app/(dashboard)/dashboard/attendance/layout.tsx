import { PageScroll } from "@/components/common/sticky-layout";

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageScroll>{children}</PageScroll>;
}
