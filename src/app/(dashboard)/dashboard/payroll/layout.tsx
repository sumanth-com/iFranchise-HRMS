import { PageScroll } from "@/components/common/sticky-layout";

export default function PayrollSelfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageScroll>{children}</PageScroll>;
}
