import { withPublicApi } from "@/lib/public-api/handler";
import { apiOverviewPayload } from "@/lib/public-api/openapi";

export async function GET(request: Request) {
  return withPublicApi(request, null, (ctx) => apiOverviewPayload(ctx));
}
