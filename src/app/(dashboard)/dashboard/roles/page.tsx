import { redirect } from "next/navigation";

import { ROLES_ROUTES } from "@/lib/roles/constants";

/** Roles & Access opens on the Roles list — dashboard tab removed. */
export default function RolesIndexPage() {
  redirect(ROLES_ROUTES.manage);
}
