import { withPublicApi } from "@/lib/public-api/handler";
import { listAssetsResource } from "@/lib/public-api/resources";

export async function GET(request: Request) {
  return withPublicApi(request, "assets:read", listAssetsResource);
}
