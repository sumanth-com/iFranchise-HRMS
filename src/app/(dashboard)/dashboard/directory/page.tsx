import { redirect } from "next/navigation";

import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";

export default function HrEmployeeDirectoryPage() {
  redirect(EMPLOYEE_ROUTES.list);
}
