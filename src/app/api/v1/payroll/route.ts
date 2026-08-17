import { withPublicApi } from "@/lib/public-api/handler";
import { listPayrollResource } from "@/lib/public-api/resources";

export async function GET(request: Request) {
  return withPublicApi(request, "payroll:read", listPayrollResource);
}
