import { withPublicApi } from "@/lib/public-api/handler";
import { getEmployeeResource } from "@/lib/public-api/resources";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withPublicApi(request, "employees:read", (ctx) => getEmployeeResource(ctx, id));
}
