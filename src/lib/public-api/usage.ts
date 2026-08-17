import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { ApiUsageLogRow, ApiUsageMetrics } from "@/lib/public-api/usage-types";

export type ApiUsageFilters = {
  apiKeyId?: string;
  endpoint?: string;
  status?: "success" | "failed" | "rate_limited";
  method?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function listApiUsageLogs(
  supabase: AuthSupabaseClient,
  organizationId: string,
  filters: ApiUsageFilters = {},
): Promise<{ data: ApiUsageLogRow[]; total: number; page: number; pageSize: number }> {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 25, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("system_api_usage_logs")
    .select(
      "id, api_key_id, request_id, method, path, status_code, response_time_ms, ip_address, user_agent, error_code, created_at, system_api_keys:api_key_id (key_prefix, name)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.apiKeyId) query = query.eq("api_key_id", filters.apiKeyId);
  if (filters.endpoint) query = query.ilike("path", `%${filters.endpoint}%`);
  if (filters.method) query = query.eq("method", filters.method.toUpperCase());
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (filters.status === "success") query = query.gte("status_code", 200).lt("status_code", 400);
  if (filters.status === "failed") query = query.gte("status_code", 400).neq("status_code", 429);
  if (filters.status === "rate_limited") query = query.eq("status_code", 429);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map((row) => {
      const key = Array.isArray(row.system_api_keys)
        ? row.system_api_keys[0]
        : row.system_api_keys;
      return {
        id: row.id as string,
        apiKeyId: (row.api_key_id as string | null) ?? null,
        keyPrefix: (key?.key_prefix as string | null) ?? null,
        keyName: (key?.name as string | null) ?? null,
        requestId: row.request_id as string,
        method: row.method as string,
        path: row.path as string,
        statusCode: Number(row.status_code),
        responseTimeMs:
          row.response_time_ms != null ? Number(row.response_time_ms) : null,
        ipAddress: (row.ip_address as string | null) ?? null,
        userAgent: (row.user_agent as string | null) ?? null,
        errorCode: (row.error_code as string | null) ?? null,
        createdAt: row.created_at as string,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getApiUsageMetrics(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ApiUsageMetrics> {
  const since = startOfTodayIso();
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_api_usage_logs")
    .select("status_code, response_time_ms")
    .eq("organization_id", organizationId)
    .gte("created_at", since);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const successful = rows.filter((row) => Number(row.status_code) < 400).length;
  const rateLimited = rows.filter((row) => Number(row.status_code) === 429).length;
  const failed = rows.filter((row) => Number(row.status_code) >= 400).length;
  const times = rows
    .map((row) => (row.response_time_ms != null ? Number(row.response_time_ms) : null))
    .filter((value): value is number => value != null);

  return {
    requestsToday: rows.length,
    successfulToday: successful,
    failedToday: failed,
    rateLimitViolationsToday: rateLimited,
    averageResponseTimeMs:
      times.length > 0
        ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
        : null,
  };
}

export async function countRecentRequests(
  supabase: AuthSupabaseClient,
  apiKeyId: string,
  windowMs: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .schema("hrms")
    .from("system_api_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function insertApiUsageLog(
  supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    apiKeyId: string | null;
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress: string | null;
    userAgent: string | null;
    errorCode: string | null;
  },
): Promise<void> {
  const { error } = await supabase.schema("hrms").from("system_api_usage_logs").insert({
    organization_id: input.organizationId,
    api_key_id: input.apiKeyId,
    request_id: input.requestId,
    method: input.method.slice(0, 16),
    path: input.path.slice(0, 500),
    status_code: input.statusCode,
    response_time_ms: input.responseTimeMs,
    ip_address: input.ipAddress?.slice(0, 64) ?? null,
    user_agent: input.userAgent?.slice(0, 300) ?? null,
    error_code: input.errorCode,
  });

  if (error && process.env.NODE_ENV === "development") {
    console.error("[public-api] usage log insert failed", error.message);
  }
}
