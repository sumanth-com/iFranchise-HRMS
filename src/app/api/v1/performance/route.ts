import { withPublicApi } from "@/lib/public-api/handler";
import { listPerformanceResource } from "@/lib/public-api/resources";

export async function GET(request: Request) {
  return withPublicApi(request, "performance:read", listPerformanceResource);
}
