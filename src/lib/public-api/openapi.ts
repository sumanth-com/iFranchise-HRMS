import { publicApiJson, type PublicApiContext } from "@/lib/public-api/handler";
import { PUBLIC_API_SCOPES, PUBLIC_API_VERSION, WEBHOOK_EVENTS } from "@/lib/public-api/constants";

export function buildOpenApiSpec(baseUrl: string) {
  const bearer = [{ bearerAuth: [] }];
  const errorSchema = {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          requestId: { type: "string" },
        },
        required: ["code", "message", "requestId"],
      },
    },
  };

  const listResponse = (itemRef: string) => ({
    type: "object",
    properties: {
      data: {
        type: "object",
        properties: {
          items: { type: "array", items: { $ref: itemRef } },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          total: { type: "integer" },
        },
      },
      requestId: { type: "string" },
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "iFranchise HRMS Public API",
      version: PUBLIC_API_VERSION,
      description:
        "Authenticated, versioned API for connecting HRMS with CRM and other business systems. Only implemented endpoints are documented.",
    },
    servers: [{ url: `${baseUrl}/api/${PUBLIC_API_VERSION}` }],
    tags: [
      { name: "Overview" },
      { name: "Employees" },
      { name: "Departments" },
      { name: "Attendance" },
      { name: "Leave" },
      { name: "Payroll" },
      { name: "Assets" },
      { name: "Performance" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Use `Authorization: Bearer <API_KEY>`. Keys are shown once at creation.",
        },
      },
      schemas: {
        Error: errorSchema,
        Employee: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            employeeCode: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string" },
            phone: { type: "string", nullable: true },
            employmentStatus: { type: "string" },
            dateOfJoining: { type: "string", nullable: true },
            department: { type: "object", nullable: true },
            branch: { type: "object", nullable: true },
            designation: { type: "object", nullable: true },
            reportingManagerId: { type: "string", nullable: true },
          },
        },
        Department: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            code: { type: "string" },
            description: { type: "string", nullable: true },
            parentDepartmentId: { type: "string", nullable: true },
            status: { type: "string" },
            branch: { type: "object", nullable: true },
          },
        },
      },
    },
    paths: {
      "/": {
        get: {
          tags: ["Overview"],
          summary: "API status",
          security: bearer,
          responses: {
            "200": { description: "API metadata for the authenticated key" },
            "401": { description: "Missing or invalid API key" },
          },
        },
      },
      "/employees": {
        get: {
          tags: ["Employees"],
          summary: "List employees",
          description: "Retrieve employees in the authenticated organization. Requires `employees:read`.",
          security: bearer,
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "employmentStatus", in: "query", schema: { type: "string" } },
            { name: "departmentId", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["created_at", "employee_code", "first_name"] } },
            { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          ],
          responses: {
            "200": { description: "Paginated employee list", content: { "application/json": { schema: listResponse("#/components/schemas/Employee") } } },
            "401": { description: "Unauthorized" },
            "403": { description: "Missing employees:read scope" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/employees/{id}": {
        get: {
          tags: ["Employees"],
          summary: "Get employee",
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "Employee record" },
            "404": { description: "Not found" },
          },
        },
      },
      "/departments": {
        get: {
          tags: ["Departments"],
          summary: "List departments",
          description: "Requires `departments:read`.",
          security: bearer,
          responses: { "200": { description: "Paginated departments" } },
        },
      },
      "/attendance": {
        get: {
          tags: ["Attendance"],
          summary: "List attendance records",
          description: "Requires `attendance:read`. Filter with employeeId, dateFrom, dateTo.",
          security: bearer,
          responses: { "200": { description: "Paginated attendance" } },
        },
      },
      "/leave": {
        get: {
          tags: ["Leave"],
          summary: "List leave requests",
          description: "Requires `leave:read`.",
          security: bearer,
          responses: { "200": { description: "Paginated leave requests" } },
        },
      },
      "/payroll": {
        get: {
          tags: ["Payroll"],
          summary: "List payroll runs",
          description:
            "Requires `payroll:read`. Returns run status and period only — salary amounts are not exposed.",
          security: bearer,
          responses: { "200": { description: "Paginated payroll runs" } },
        },
      },
      "/assets": {
        get: {
          tags: ["Assets"],
          summary: "List assets",
          description: "Requires `assets:read`. Purchase cost is not included.",
          security: bearer,
          responses: { "200": { description: "Paginated assets" } },
        },
      },
      "/performance": {
        get: {
          tags: ["Performance"],
          summary: "List performance reviews",
          description: "Requires `performance:read`. Returns review status, not comments or ratings.",
          security: bearer,
          responses: { "200": { description: "Paginated reviews" } },
        },
      },
    },
    "x-hrms": {
      scopes: PUBLIC_API_SCOPES,
      webhookEvents: WEBHOOK_EVENTS,
      pagination: { page: 1, pageSize: 25, maxPageSize: 100 },
      errorFormat: {
        error: { code: "unauthorized", message: "Invalid or missing API key", requestId: "uuid" },
      },
    },
  };
}

export function apiOverviewPayload(ctx: PublicApiContext) {
  return publicApiJson(ctx.requestId, {
    name: "iFranchise HRMS API",
    version: PUBLIC_API_VERSION,
    environment: ctx.apiKey.environment,
    keyPrefix: ctx.apiKey.prefix,
    scopes: ctx.apiKey.scopes,
    documentation: "/dashboard/system/integrations?tab=api&api=docs",
  });
}
