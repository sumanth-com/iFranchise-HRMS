import { redirect } from "next/navigation";

import { ROLES_ROUTES } from "@/lib/roles/constants";

/** Permission Matrix removed from UI — keep route and redirect to Roles. */
export default function PermissionMatrixPage() {
  redirect(ROLES_ROUTES.manage);
}
