import type { ReportKey, ReportModuleKey } from "@/types/reports";
import { REPORT_DEFINITIONS } from "@/lib/reports/constants";

export type ManagerReportCategory =
  | "attendance"
  | "leave"
  | "performance"
  | "recruitment"
  | "training"
  | "team";

export const MANAGER_REPORT_CATEGORIES: {
  id: ManagerReportCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "attendance",
    label: "Attendance Reports",
    description: "Present %, late %, absent %, WFH, overtime, and working hours.",
  },
  {
    id: "leave",
    label: "Leave Reports",
    description: "Utilization, balances, trends, upcoming leave, and approvals.",
  },
  {
    id: "performance",
    label: "Performance Reports",
    description: "Ratings, goals, reviews, high performers, and promotions.",
  },
  {
    id: "recruitment",
    label: "Recruitment Reports",
    description: "Open positions, pipeline, interviews, and time to fill.",
  },
  {
    id: "training",
    label: "Training Reports",
    description: "Training recommendations, certifications, and completion status.",
  },
  {
    id: "team",
    label: "Team Summary",
    description: "Headcount, growth, and consolidated team metrics.",
  },
];

/** Same report modules as HR (team-scoped at query time). HR module page exists but is not in sub-nav. */
const MANAGER_ALLOWED_MODULES: ReportModuleKey[] = [
  "hr",
  "attendance",
  "leave",
  "payroll",
  "performance",
  "recruitment",
  "assets",
  "exit",
];

export const MANAGER_REPORT_DEFINITIONS = REPORT_DEFINITIONS.filter((definition) =>
  MANAGER_ALLOWED_MODULES.includes(definition.module),
);

export function getManagerReportsForCategory(category: ManagerReportCategory) {
  if (category === "training" || category === "team") return [];
  if (category === "attendance") {
    return MANAGER_REPORT_DEFINITIONS.filter((d) => d.module === "attendance");
  }
  if (category === "leave") {
    return MANAGER_REPORT_DEFINITIONS.filter((d) => d.module === "leave");
  }
  if (category === "performance") {
    return MANAGER_REPORT_DEFINITIONS.filter((d) => d.module === "performance");
  }
  if (category === "recruitment") {
    return MANAGER_REPORT_DEFINITIONS.filter((d) => d.module === "recruitment");
  }
  return MANAGER_REPORT_DEFINITIONS.filter((d) => d.module === "hr");
}

export function isManagerAllowedReportKey(key: ReportKey) {
  return MANAGER_REPORT_DEFINITIONS.some((definition) => definition.key === key);
}
