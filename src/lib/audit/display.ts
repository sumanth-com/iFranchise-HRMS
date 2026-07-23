import { formatAuditAction, formatAuditModule } from "@/lib/audit/constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID_IN_VALUE_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const METADATA_LABEL_KEYS = [
  "employeeName",
  "fullName",
  "name",
  "roleName",
  "employeeEmail",
  "email",
  "employeeCode",
  "title",
  "description",
] as const;

const TABLE_LABELS: Record<string, string> = {
  application: "Application",
  employees: "Employee",
  employee: "Employee",
  user_roles: "User role",
  roles: "Role",
  permissions: "Permission",
  role_permissions: "Role permission",
  departments: "Department",
  branches: "Branch",
  designations: "Designation",
  employee_invitations: "Invitation",
  audit_logs: "Audit log",
};

export function isAuditUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_RE.test(value);
}

/** Short, URL-friendly audit log reference (first UUID segment). */
export function buildAuditLogRef(id: string): string {
  return id.split("-")[0]?.toLowerCase() ?? id;
}

export function formatAuditTableLabel(tableName: string | null | undefined): string {
  if (!tableName) return "Record";
  const normalized = tableName.toLowerCase();
  if (TABLE_LABELS[normalized]) return TABLE_LABELS[normalized];
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pickMetadataLabel(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  for (const key of METADATA_LABEL_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function formatAuditRecordLabel(input: {
  recordId: string;
  tableName?: string | null;
  module?: string | null;
  action?: string | null;
  description?: string | null;
  oldRecord?: Record<string, unknown> | null;
  newRecord?: Record<string, unknown> | null;
}): string {
  const fromMeta =
    pickMetadataLabel(input.newRecord) ?? pickMetadataLabel(input.oldRecord);
  if (fromMeta) return fromMeta;

  const recordId = input.recordId?.trim();
  if (!recordId || recordId === "system") return "System";

  if (!isAuditUuid(recordId)) {
    return recordId;
  }

  const description = input.description?.toLowerCase() ?? "";
  if (description.includes("audit log") || input.tableName === "audit_logs") {
    return "Audit log entry";
  }

  const table = formatAuditTableLabel(input.tableName);
  const module = input.module ? formatAuditModule(input.module) : null;
  const action = input.action ? formatAuditAction(input.action) : null;

  if (module && action) {
    return `${module} · ${action}`;
  }

  return table;
}

function humanizeFieldKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPrimitiveValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (isAuditUuid(value)) return "—";
    if (UUID_IN_VALUE_RE.test(value)) {
      return value.replace(UUID_IN_VALUE_RE, "").replace(/\s{2,}/g, " ").trim() || "—";
    }
    return value;
  }
  return String(value);
}

export function sanitizeAuditRecordData(
  data: Record<string, unknown> | null | undefined,
): Array<{ label: string; value: string }> {
  if (!data || Object.keys(data).length === 0) return [];

  const rows: Array<{ label: string; value: string }> = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = sanitizeAuditRecordData(value as Record<string, unknown>);
      for (const row of nested) {
        rows.push({
          label: `${humanizeFieldKey(key)} · ${row.label}`,
          value: row.value,
        });
      }
      continue;
    }

    if (Array.isArray(value)) {
      const formatted = value
        .map((item) => formatPrimitiveValue(item))
        .filter((item) => item !== "—")
        .join(", ");
      if (formatted) {
        rows.push({ label: humanizeFieldKey(key), value: formatted });
      }
      continue;
    }

    const formatted = formatPrimitiveValue(value);
    if (formatted !== "—") {
      rows.push({ label: humanizeFieldKey(key), value: formatted });
    }
  }

  return rows;
}
