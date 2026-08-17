import { withPublicApi } from "@/lib/public-api/handler";
import { listAttendanceResource } from "@/lib/public-api/resources";

export async function GET(request: Request) {
  return withPublicApi(request, "attendance:read", listAttendanceResource);
}
