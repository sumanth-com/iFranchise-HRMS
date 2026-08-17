import { withPublicApi } from "@/lib/public-api/handler";
import { listEmployeesResource } from "@/lib/public-api/resources";

export async function GET(request: Request) {
  return withPublicApi(request, "employees:read", listEmployeesResource);
}
