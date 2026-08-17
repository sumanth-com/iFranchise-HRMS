import { NextResponse } from "next/server";

export type PublicApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "validation_error"
  | "api_disabled"
  | "internal_error";

const STATUS_BY_CODE: Record<PublicApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  validation_error: 400,
  api_disabled: 503,
  internal_error: 500,
};

const SAFE_MESSAGES: Record<PublicApiErrorCode, string> = {
  unauthorized: "Invalid or missing API key",
  forbidden: "The API key does not have permission for this resource",
  not_found: "Resource not found",
  rate_limited: "Rate limit exceeded",
  validation_error: "Invalid request",
  api_disabled: "The public API is disabled for this organization",
  internal_error: "An unexpected error occurred",
};

export class PublicApiError extends Error {
  readonly code: PublicApiErrorCode;
  readonly status: number;
  readonly safeMessage: string;

  constructor(code: PublicApiErrorCode, message?: string) {
    super(message ?? SAFE_MESSAGES[code]);
    this.name = "PublicApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.safeMessage = SAFE_MESSAGES[code];
  }
}

export function publicApiErrorResponse(
  requestId: string,
  error: unknown,
  extraHeaders?: HeadersInit,
) {
  const apiError =
    error instanceof PublicApiError
      ? error
      : new PublicApiError("internal_error");

  if (!(error instanceof PublicApiError) && process.env.NODE_ENV === "development") {
    console.error("[public-api]", error);
  }

  const headers = new Headers(extraHeaders);
  headers.set("X-Request-ID", requestId);
  headers.set("X-API-Version", "v1");
  if (apiError.code === "unauthorized") {
    headers.set("WWW-Authenticate", "Bearer");
  }

  return NextResponse.json(
    {
      error: {
        code: apiError.code,
        message: apiError.safeMessage,
        requestId,
      },
    },
    { status: apiError.status, headers },
  );
}

export function publicApiJson<T>(
  requestId: string,
  data: T,
  init?: { status?: number; headers?: HeadersInit },
) {
  const headers = new Headers(init?.headers);
  headers.set("X-Request-ID", requestId);
  headers.set("X-API-Version", "v1");
  return NextResponse.json({ data, requestId }, { status: init?.status ?? 200, headers });
}
