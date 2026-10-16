import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

/** Promotions module replaced by Probation & Confirmation. */
export default function CeoPromotionsRedirectPage() {
  redirect(`${CEO_ROUTES.performance}/probation`);
}
