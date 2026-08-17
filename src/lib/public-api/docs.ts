export type ApiDocSectionId =
  | "overview"
  | "authentication"
  | "employees"
  | "departments"
  | "attendance"
  | "leave"
  | "payroll"
  | "assets"
  | "performance"
  | "webhooks"
  | "errors"
  | "rate-limits"
  | "changelog";

export type ApiDocEndpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  scope: string;
  parameters?: Array<{ name: string; in: "query" | "path"; required?: boolean; description: string }>;
  requestExample?: string;
  responseExample: string;
  errors: Array<{ status: number; code: string; meaning: string }>;
};

export type ApiDocSection = {
  id: ApiDocSectionId;
  title: string;
  group?: "endpoints";
  intro: string;
  endpoints?: ApiDocEndpoint[];
  body?: string[];
};

const STANDARD_ERRORS: ApiDocEndpoint["errors"] = [
  { status: 401, code: "unauthorized", meaning: "Missing, invalid, revoked, or expired API key" },
  { status: 403, code: "forbidden", meaning: "Authenticated, but the key lacks the required scope" },
  { status: 404, code: "not_found", meaning: "Resource does not exist in this organization" },
  { status: 429, code: "rate_limited", meaning: "Too many requests for this key" },
  { status: 500, code: "internal_error", meaning: "Unexpected server error" },
];

const LIST_PARAMS: ApiDocEndpoint["parameters"] = [
  { name: "page", in: "query", description: "Page number, starting at 1" },
  { name: "pageSize", in: "query", description: "Results per page, max 100" },
  { name: "sort", in: "query", description: "Sort field supported by the endpoint" },
  { name: "order", in: "query", description: "`asc` or `desc`" },
];

export const API_DOC_NAV: Array<{ id: ApiDocSectionId; title: string; children?: ApiDocSectionId[] }> = [
  { id: "overview", title: "Overview" },
  { id: "authentication", title: "Authentication" },
  {
    id: "employees",
    title: "Endpoints",
    children: [
      "employees",
      "departments",
      "attendance",
      "leave",
      "payroll",
      "assets",
      "performance",
    ],
  },
  { id: "webhooks", title: "Webhooks" },
  { id: "errors", title: "Errors" },
  { id: "rate-limits", title: "Rate Limits" },
  { id: "changelog", title: "Changelog" },
];

export const API_DOC_SECTIONS: ApiDocSection[] = [
  {
    id: "overview",
    title: "Overview",
    intro:
      "The HRMS public API lets CRM and other internal systems read authorized organization data over HTTPS.",
    body: [
      "Current version: v1. Future versions can coexist at /api/v2 without breaking v1 clients.",
      "Base URL: {origin}/api/v1",
      "All responses are JSON. Every response includes X-Request-ID for tracing.",
      "Write endpoints are not published yet. Write scopes can be assigned so keys are ready when those routes ship.",
    ],
  },
  {
    id: "authentication",
    title: "Authentication",
    intro: "Authenticate every request with a Bearer API key issued in Super Admin → System / Integrations → API.",
    body: [
      "Header: Authorization: Bearer hrms_...",
      "Keys are shown once at creation. The server stores only a SHA-256 hash and a non-secret prefix.",
      "Revoked, expired, IP-restricted, or disabled-environment keys are rejected with 401 or 403.",
      "Never put API keys in NEXT_PUBLIC_* variables or frontend source.",
    ],
  },
  {
    id: "employees",
    title: "Employees",
    group: "endpoints",
    intro: "Retrieve employees accessible to the authenticated API client. Personal profile, bank, and salary fields are not included.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/employees",
        description: "List employees in the key’s organization.",
        scope: "employees:read",
        parameters: [
          ...LIST_PARAMS,
          { name: "search", in: "query", description: "Match employee code, name, or work email" },
          { name: "employmentStatus", in: "query", description: "Filter by employment status" },
          { name: "departmentId", in: "query", description: "Filter by department UUID" },
        ],
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" \\
  "{origin}/api/v1/employees?page=1&pageSize=25"`,
        responseExample: `{
  "data": {
    "items": [
      {
        "id": "uuid",
        "employeeCode": "IFR-001",
        "firstName": "Asha",
        "lastName": "Rao",
        "email": "asha@company.com",
        "employmentStatus": "active",
        "department": { "id": "uuid", "name": "HR", "code": "HR" }
      }
    ],
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
      {
        method: "GET",
        path: "/api/v1/employees/{id}",
        description: "Retrieve a single employee by id.",
        scope: "employees:read",
        parameters: [{ name: "id", in: "path", required: true, description: "Employee UUID" }],
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" \\
  "{origin}/api/v1/employees/{id}"`,
        responseExample: `{
  "data": {
    "id": "uuid",
    "employeeCode": "IFR-001",
    "firstName": "Asha",
    "lastName": "Rao",
    "email": "asha@company.com",
    "employmentStatus": "active"
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
    ],
  },
  {
    id: "departments",
    title: "Departments",
    group: "endpoints",
    intro: "Organization structure for CRM sync.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/departments",
        description: "List departments and their branch.",
        scope: "departments:read",
        parameters: LIST_PARAMS,
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" "{origin}/api/v1/departments"`,
        responseExample: `{
  "data": {
    "items": [{ "id": "uuid", "name": "HR", "code": "HR", "status": "active" }],
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
    ],
  },
  {
    id: "attendance",
    title: "Attendance",
    group: "endpoints",
    intro: "Daily attendance records for authorized employees.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/attendance",
        description: "List attendance. Filter with employeeId, dateFrom, dateTo (YYYY-MM-DD).",
        scope: "attendance:read",
        parameters: [
          ...LIST_PARAMS,
          { name: "employeeId", in: "query", description: "Employee UUID" },
          { name: "dateFrom", in: "query", description: "Inclusive start date" },
          { name: "dateTo", in: "query", description: "Inclusive end date" },
        ],
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" "{origin}/api/v1/attendance?dateFrom=2026-08-01"`,
        responseExample: `{
  "data": {
    "items": [{
      "id": "uuid",
      "employeeId": "uuid",
      "date": "2026-08-17",
      "status": "present",
      "workHours": 8
    }],
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
    ],
  },
  {
    id: "leave",
    title: "Leave",
    group: "endpoints",
    intro: "Leave requests. Reasons may be omitted from future tighter payloads; today status and dates are returned.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/leave",
        description: "List leave requests. Filter with employeeId and leaveStatus.",
        scope: "leave:read",
        parameters: [
          ...LIST_PARAMS,
          { name: "employeeId", in: "query", description: "Employee UUID" },
          { name: "leaveStatus", in: "query", description: "pending, approved, rejected, cancelled, withdrawn" },
        ],
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" "{origin}/api/v1/leave?leaveStatus=approved"`,
        responseExample: `{
  "data": {
    "items": [{
      "id": "uuid",
      "employeeId": "uuid",
      "startDate": "2026-08-20",
      "endDate": "2026-08-21",
      "totalDays": 2,
      "status": "approved"
    }],
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
    ],
  },
  {
    id: "payroll",
    title: "Payroll",
    group: "endpoints",
    intro: "Payroll run metadata only. Salary amounts, bank details, and payslip files are not exposed.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/payroll",
        description: "List payroll runs (period and status).",
        scope: "payroll:read",
        parameters: LIST_PARAMS,
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" "{origin}/api/v1/payroll"`,
        responseExample: `{
  "data": {
    "items": [{
      "id": "uuid",
      "payrollMonth": "2026-08-01",
      "status": "processed",
      "processedAt": "2026-08-05T10:00:00.000Z"
    }],
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
    ],
  },
  {
    id: "assets",
    title: "Assets",
    group: "endpoints",
    intro: "Company assets. Purchase cost is not included.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/assets",
        description: "List assets.",
        scope: "assets:read",
        parameters: LIST_PARAMS,
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" "{origin}/api/v1/assets"`,
        responseExample: `{
  "data": {
    "items": [{
      "id": "uuid",
      "assetCode": "LAP-014",
      "name": "MacBook Pro",
      "status": "assigned"
    }],
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
    ],
  },
  {
    id: "performance",
    title: "Performance",
    group: "endpoints",
    intro: "Review status only — comments and ratings are not exposed.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/performance",
        description: "List performance reviews.",
        scope: "performance:read",
        parameters: LIST_PARAMS,
        requestExample: `curl -H "Authorization: Bearer $HRMS_API_KEY" "{origin}/api/v1/performance"`,
        responseExample: `{
  "data": {
    "items": [{
      "id": "uuid",
      "employeeId": "uuid",
      "status": "approved",
      "cycleId": "uuid"
    }],
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "requestId": "uuid"
}`,
        errors: STANDARD_ERRORS,
      },
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    intro: "HRMS can POST events to HTTPS endpoints you register. Signing secrets are shown once.",
    body: [
      "Header X-HRMS-Event identifies the event type.",
      "Header X-HRMS-Signature is t=<unix>,v1=<hmac-sha256 of timestamp.body>.",
      "Verify the signature before processing. Retry of failed deliveries is recorded; a dedicated retry worker is not running yet — first delivery is attempted immediately.",
      "Implemented events: employee.created, employee.updated, employee.deleted, employee.status_changed, leave.created, leave.approved, leave.rejected, attendance.updated, payroll.processed, asset.assigned, asset.returned, performance.review_completed.",
    ],
  },
  {
    id: "errors",
    title: "Errors",
    intro: "Errors use a stable JSON envelope. Internal exception text is never returned to API clients.",
    body: [
      `{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or missing API key",
    "requestId": "uuid"
  }
}`,
      "Trace the same requestId in Super Admin → API → Usage / Logs.",
    ],
  },
  {
    id: "rate-limits",
    title: "Rate Limits",
    intro: "Each key has a per-minute limit. Standard is 60, high volume is 300, or a custom value set on the key.",
    body: [
      "429 Too Many Requests is returned when the limit is exceeded.",
      "Headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After.",
      "Limits are enforced from usage logs so they remain effective across Vercel instances.",
    ],
  },
  {
    id: "changelog",
    title: "Changelog",
    intro: "v1 — Initial public API.",
    body: [
      "GET /api/v1 — API status for a valid key.",
      "GET employees, departments, attendance, leave, payroll (metadata), assets, performance (status).",
      "API keys, usage logs, webhooks, and settings in Super Admin.",
    ],
  },
];
