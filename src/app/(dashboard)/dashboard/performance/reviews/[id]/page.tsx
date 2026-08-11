import { redirect } from "next/navigation";

import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  redirect(`${PERFORMANCE_ROUTES.reviews}?openReview=${id}`);
}
