export type ApiUsageLogRow = {
  id: string;
  apiKeyId: string | null;
  keyPrefix: string | null;
  keyName: string | null;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  errorCode: string | null;
  createdAt: string;
};

export type ApiUsageMetrics = {
  requestsToday: number;
  successfulToday: number;
  failedToday: number;
  rateLimitViolationsToday: number;
  averageResponseTimeMs: number | null;
};
