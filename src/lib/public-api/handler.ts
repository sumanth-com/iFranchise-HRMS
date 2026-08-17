import "server-only";

import type { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicApiScope } from "@/lib/public-api/constants";
import { clientIp, requestIdFrom } from "@/lib/public-api/crypto";
import {
  PublicApiError,
  publicApiErrorResponse,
  publicApiJson,
} from "@/lib/public-api/errors";
import { authenticatePublicApi, type AuthenticatedApiKey } from "@/lib/public-api/auth";
import { insertApiUsageLog } from "@/lib/public-api/usage";

export type PublicApiContext = {
  request: Request;
  requestId: string;
  apiKey: AuthenticatedApiKey;
  admin: ReturnType<typeof createAdminClient>;
  url: URL;
};

function pathForLog(url: URL) {
  return `${url.pathname}${url.search}`.slice(0, 500);
}

async function recordUsage(input: {
  startedAt: number;
  request: Request;
  requestId: string;
  apiKey: AuthenticatedApiKey | null;
  organizationId?: string;
  statusCode: number;
  errorCode: string | null;
}) {
  const admin = createAdminClient();
  const organizationId = input.apiKey?.organizationId ?? input.organizationId;
  if (!organizationId) return;

  await insertApiUsageLog(admin, {
    organizationId,
    apiKeyId: input.apiKey?.id ?? null,
    requestId: input.requestId,
    method: input.request.method,
    path: pathForLog(new URL(input.request.url)),
    statusCode: input.statusCode,
    responseTimeMs: Date.now() - input.startedAt,
    ipAddress: clientIp(input.request),
    userAgent: input.request.headers.get("user-agent"),
    errorCode: input.errorCode,
  });

  if (input.apiKey) {
    await admin.schema("hrms").rpc("record_system_api_key_usage", {
      p_key_id: input.apiKey.id,
      p_ip: clientIp(input.request),
    });
  }
}

export async function withPublicApi(
  request: Request,
  scope: PublicApiScope | null,
  handler: (ctx: PublicApiContext) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = requestIdFrom(request);
  let apiKey: AuthenticatedApiKey | null = null;

  try {
    apiKey = await authenticatePublicApi(request, scope);
    const remainingHeader = {
      "X-RateLimit-Limit": String(apiKey.rateLimit),
      "X-RateLimit-Remaining": String(Math.max(apiKey.rateLimit - 1, 0)),
    };

    const response = await handler({
      request,
      requestId,
      apiKey,
      admin: createAdminClient(),
      url: new URL(request.url),
    });

    for (const [key, value] of Object.entries(remainingHeader)) {
      response.headers.set(key, value);
    }
    response.headers.set("X-Request-ID", requestId);
    response.headers.set("X-API-Version", "v1");

    void recordUsage({
      startedAt,
      request,
      requestId,
      apiKey,
      statusCode: response.status,
      errorCode: response.status >= 400 ? "request_failed" : null,
    });

    return response;
  } catch (error) {
    const response = publicApiErrorResponse(requestId, error, {
      ...(apiKey
        ? {
            "X-RateLimit-Limit": String(apiKey.rateLimit),
            "Retry-After": error instanceof PublicApiError && error.code === "rate_limited" ? "60" : "",
          }
        : {}),
    });

    void recordUsage({
      startedAt,
      request,
      requestId,
      apiKey,
      statusCode: response.status,
      errorCode: error instanceof PublicApiError ? error.code : "internal_error",
    });

    return response;
  }
}

export function listParams(url: URL) {
  const page = Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25, 1),
    100,
  );
  const sort = url.searchParams.get("sort") ?? "created_at";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: (page - 1) * pageSize + pageSize - 1,
    sort,
    order,
    search: url.searchParams.get("search")?.trim() || undefined,
  };
}

export { publicApiJson };
