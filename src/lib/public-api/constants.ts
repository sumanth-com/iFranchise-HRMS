export const PUBLIC_API_VERSION = "v1" as const;

export const PUBLIC_API_SCOPES = [
  "employees:read",
  "employees:write",
  "departments:read",
  "attendance:read",
  "attendance:write",
  "leave:read",
  "leave:write",
  "payroll:read",
  "assets:read",
  "assets:write",
  "performance:read",
  "performance:write",
  "system:read",
  "system:write",
] as const;

export type PublicApiScope = (typeof PUBLIC_API_SCOPES)[number];

export const PUBLIC_API_SCOPE_GROUPS: Array<{
  id: "read" | "write" | "admin";
  label: string;
  scopes: PublicApiScope[];
}> = [
  {
    id: "read",
    label: "Read",
    scopes: [
      "employees:read",
      "departments:read",
      "attendance:read",
      "leave:read",
      "payroll:read",
      "assets:read",
      "performance:read",
    ],
  },
  {
    id: "write",
    label: "Write",
    scopes: [
      "employees:write",
      "attendance:write",
      "leave:write",
      "assets:write",
      "performance:write",
    ],
  },
  {
    id: "admin",
    label: "Admin",
    scopes: ["system:read", "system:write"],
  },
];

export const IMPLEMENTED_WRITE_SCOPES: PublicApiScope[] = [];

export const RATE_LIMIT_TIERS = {
  standard: 60,
  high_volume: 300,
  custom: 60,
} as const;

export type ApiRateLimitTier = keyof typeof RATE_LIMIT_TIERS;

export const API_KEY_PREFIX = "hrms_";

export const DEFAULT_API_CONFIG = {
  enabled: true,
  currentVersion: PUBLIC_API_VERSION,
  defaultRateLimitPerMinute: RATE_LIMIT_TIERS.standard,
  allowedEnvironments: ["production", "sandbox"] as const,
  webhooksEnabled: true,
};

export const WEBHOOK_EVENTS = [
  "employee.created",
  "employee.updated",
  "employee.deleted",
  "employee.status_changed",
  "leave.created",
  "leave.approved",
  "leave.rejected",
  "attendance.updated",
  "payroll.processed",
  "asset.assigned",
  "asset.returned",
  "performance.review_completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  "employee.created": "Employee created",
  "employee.updated": "Employee updated",
  "employee.deleted": "Employee deleted",
  "employee.status_changed": "Employee status changed",
  "leave.created": "Leave submitted",
  "leave.approved": "Leave approved",
  "leave.rejected": "Leave rejected",
  "attendance.updated": "Attendance updated",
  "payroll.processed": "Payroll processed",
  "asset.assigned": "Asset assigned",
  "asset.returned": "Asset returned",
  "performance.review_completed": "Performance review completed",
};

export function isPublicApiScope(value: string): value is PublicApiScope {
  return (PUBLIC_API_SCOPES as readonly string[]).includes(value);
}

export function expandLegacyPermissions(permissions: string[]): PublicApiScope[] {
  if (permissions.includes("admin")) {
    return [
      "employees:read",
      "departments:read",
      "attendance:read",
      "leave:read",
      "payroll:read",
      "assets:read",
      "performance:read",
      "system:read",
      "system:write",
    ];
  }
  if (permissions.includes("write")) {
    return [
      "employees:read",
      "departments:read",
      "attendance:read",
      "leave:read",
      "assets:read",
      "performance:read",
    ];
  }
  return ["employees:read", "departments:read", "attendance:read", "leave:read"];
}
