import { PageScroll } from "@/components/common/sticky-layout";

export default function AssetsSelfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageScroll>{children}</PageScroll>;
}
