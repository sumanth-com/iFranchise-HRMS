import { redirect } from "next/navigation";

export default function SuperAdminSettingsPage(): never {
  redirect("/dashboard/system");
}
