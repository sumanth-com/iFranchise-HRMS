import { redirect } from "next/navigation";

import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";

export default function RootRedirectPage() {
  redirect(HR_PORTAL_HOME);
}
