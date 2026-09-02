import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoEmployeeDirectoryRedirectPage() {
  redirect(CEO_ROUTES.employees);
}
