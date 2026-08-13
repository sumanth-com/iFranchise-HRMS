import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoExitRedirectPage() {
  redirect(CEO_ROUTES.approvalsExit);
}
