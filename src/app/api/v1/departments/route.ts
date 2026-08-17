import { withPublicApi } from "@/lib/public-api/handler";
import { listDepartmentsResource } from "@/lib/public-api/resources";

export async function GET(request: Request) {
  return withPublicApi(request, "departments:read", listDepartmentsResource);
}
