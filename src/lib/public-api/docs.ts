export type ApiDocSectionId =
  | "overview"
  | "authentication"
  | "base-url"
  | "versioning"
  | "headers"
  | "response-format"
  | "employees"
  | "departments"
  | "attendance"
  | "leave"
  | "payroll"
  | "assets"
  | "performance"
  | "webhooks"
  | "errors"
  | "rate-limits";

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

export const API_DOC_NAV: Array<{
  id: ApiDocSectionId | "endpoints";
  title: string;
  children?: ApiDocSectionId[];
}> = [
  { id: "overview", title: "Overview" },
  { id: "authentication", title: "Authentication" },
  { id: "base-url", title: "Base URL" },
  { id: "versioning", title: "API versioning" },
  { id: "headers", title: "Request headers" },
  { id: "response-format", title: "Response format" },
  { id: "errors", title: "Error handling" },
  { id: "rate-limits", title: "Rate limits" },
  {
    id: "endpoints",
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
];

export const API_DOC_SECTIONS: ApiDocSection[] = [
  {
    id: "overview",
    title: "Overview",
    intro:
      "The iFranchise HRMS Public API exposes read-only organization data over HTTPS for CRM and internal system integrations.",
    body: [
      "Only implemented v1 routes are documented here. Write HTTP routes are not published yet.",
      "Machine clients authenticate with organization-scoped API keys issued in Super Admin → Infrastructure → API → API Keys.",
      "OpenAPI machine-readable spec: GET {origin}/api/v1/openapi.json",
      "Live status for a valid key (no extra scope beyond authentication):",
      `curl -H "Authorization: Bearer $HRMS_API_KEY" "{origin}/api/v1"`,
      `{
  "data": {
    "name": "iFranchise HRMS API",
    "version": "v1",
    "environment": "production",
    "keyPrefix": "hrms_live_ab12",
    "scopes": ["employees:read", "departments:read"],
    "documentation": "/dashboard/system/integrations?tab=api&api=docs"
  },
  "requestId": "uuid"
}`,
    ],
  },
  {
    id: "authentication",
    title: "Authentication",
    intro: "Authenticate every request with a Bearer API key.",
    body: [
      "Authorization: Bearer hrms_...",
      "Keys are shown once at creation. The server stores only a SHA-256 hash and a non-secret prefix.",
      "Revoked, expired, IP-restricted, or disabled-environment keys are rejected with 401 or 403.",
      "Never put API keys in NEXT_PUBLIC_* variables or browser source.",
    ],
  },
  {
    id: "base-url",
    title: "Base URL",
    intro: "All v1 resources are served under a single HTTPS base path.",
    body: [
      "{origin}/api/v1",
      "Example: {origin}/api/v1/employees",
      "Replace {origin} with your deployed HRMS host (local development is typically http://localhost:3000).",
    ],
  },
  {
    id: "versioning",
    title: "API versioning",
    intro: "The path segment encodes the API version.",
    body: [
      "Current version: v1",
      "Future major versions can ship as /api/v2 without changing existing /api/v1 clients.",
      "Clients should pin to /api/v1 and treat undocumented fields as optional.",
    ],
  },
  {
    id: "headers",
    title: "Request headers",
    intro: "Required and recommended headers for every call.",
    body: [
      "Authorization: Bearer <API_KEY>  (required)",
      "Accept: application/json  (recommended)",
      "Content-Type: application/json  (required for future write routes)",
      "Successful responses include X-Request-Id for tracing in Usage & Logs.",
    ],
  },
  {
    id: "response-format",
    title: "Response format",
    intro: "Successful list and item responses use a consistent JSON envelope.",
    body: [
      `{
  "data": { /* resource or { items, page, pageSize, total } */ },
  "requestId": "uuid"
}`,
      "List endpoints paginate with page / pageSize and return total matching rows.",
      "Sensitive fields (salary, bank details, payslip files, review comments) are intentionally omitted.",
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
        "phone": null,
        "employmentStatus": "active",
        "dateOfJoining": "2024-01-15",
        "department": { "id": "uuid", "name": "HR", "code": "HR" },
        "branch": { "id": "uuid", "name": "HQ", "code": "HQ" },
        "designation": { "id": "uuid", "title": "HR Executive" },
        "reportingManagerId": null,
        "createdAt": "2024-01-15T08:00:00.000Z",
        "updatedAt": "2026-08-01T10:00:00.000Z"
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
    "phone": null,
    "employmentStatus": "active",
    "dateOfJoining": "2024-01-15",
    "department": { "id": "uuid", "name": "HR", "code": "HR" },
    "branch": { "id": "uuid", "name": "HQ", "code": "HQ" },
    "designation": { "id": "uuid", "title": "HR Executive" },
    "reportingManagerId": null,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2026-08-01T10:00:00.000Z"
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
    "items": [{
      "id": "uuid",
      "name": "HR",
      "code": "HR",
      "description": null,
      "parentDepartmentId": null,
      "status": "active",
      "branch": { "id": "uuid", "name": "HQ", "code": "HQ" },
      "createdAt": "2024-01-01T00:00:00.000Z"
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
      "checkInAt": "2026-08-17T03:30:00.000Z",
      "checkOutAt": "2026-08-17T12:30:00.000Z",
      "status": "present",
      "workHours": 8,
      "overtimeHours": 0,
      "createdAt": "2026-08-17T03:30:00.000Z"
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
    intro: "Leave requests. Reason text is not exposed; status, type, and dates are returned.",
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
      "employeeCode": "IFR-001",
      "employeeName": "Asha Rao",
      "leaveType": "Casual Leave",
      "leaveTypeCode": "CL",
      "startDate": "2026-08-20",
      "endDate": "2026-08-21",
      "totalDays": 2,
      "isHalfDay": false,
      "status": "approved",
      "createdAt": "2026-08-10T09:00:00.000Z"
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
      "processedAt": "2026-08-05T10:00:00.000Z",
      "approvedAt": "2026-08-05T11:00:00.000Z",
      "createdAt": "2026-08-01T00:00:00.000Z"
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
      "status": "assigned",
      "officeLocation": "HQ",
      "departmentId": "uuid",
      "currentAssignmentId": "uuid",
      "createdAt": "2025-03-01T00:00:00.000Z"
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
      "cycleId": "uuid",
      "createdAt": "2026-01-10T00:00:00.000Z",
      "updatedAt": "2026-02-01T00:00:00.000Z"
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
    title: "Error handling",
    intro: "Errors use a stable JSON envelope. Internal exception text is never returned to API clients.",
    body: [
      `{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or missing API key",
    "requestId": "uuid"
  }
}`,
      "Trace the same requestId in Super Admin → Infrastructure → API → Usage & Logs.",
    ],
  },
  {
    id: "rate-limits",
    title: "Rate limits",
    intro: "Each key has a per-minute limit. Standard is 60, high volume is 300, or a custom value set on the key.",
    body: [
      "HTTP 429 is returned when the limit is exceeded.",
      "Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After.",
      "Limits are enforced from usage logs so they remain effective across instances.",
    ],
  },
];
