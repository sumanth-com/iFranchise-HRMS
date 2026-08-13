import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoLeaveRedirectPage() {
  redirect(CEO_ROUTES.approvalsLeave);
}
