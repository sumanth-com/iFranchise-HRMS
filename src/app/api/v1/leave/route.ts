import { withPublicApi } from "@/lib/public-api/handler";
import { listLeaveResource } from "@/lib/public-api/resources";

export async function GET(request: Request) {
  return withPublicApi(request, "leave:read", listLeaveResource);
}
