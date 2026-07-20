import { PageScroll } from "@/components/common/sticky-layout";

export default function DocumentsSelfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageScroll>{children}</PageScroll>;
}
