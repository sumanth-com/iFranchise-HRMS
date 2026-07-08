import { PageScroll } from "@/components/common/sticky-layout";

export default function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageScroll>{children}</PageScroll>;
}
