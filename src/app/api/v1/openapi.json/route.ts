import { NextResponse } from "next/server";

import { withPublicApi } from "@/lib/public-api/handler";
import { buildOpenApiSpec } from "@/lib/public-api/openapi";

export async function GET(request: Request) {
  return withPublicApi(request, null, async (ctx) => {
    const spec = buildOpenApiSpec(ctx.url.origin);
    return NextResponse.json(spec, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "X-API-Version": "v1",
        "Content-Type": "application/json",
      },
    });
  });
}
