import { REPORT_DEFINITIONS } from "@/lib/reports/constants";
import type { ReportKey } from "@/types/reports";
import type { CeoReportCategory } from "@/types/ceo-reports";

export const CEO_REPORT_CATEGORY_LABELS: Record<CeoReportCategory, string> = {
  attendance: "Attendance Report",
  leave: "Leave Report",
  payroll: "Payroll Report",
  recruitment: "Recruitment Report",
  performance: "Performance Report",
  department: "Department Report",
  headcount: "Headcount Report",
  attrition: "Attrition Report",
  training: "Training Report",
  organization: "Organization Report",
  executive_summary: "Executive Summary",
  board: "Board Report",
  compliance: "Compliance Report",
};

export const CEO_REPORT_CATEGORIES = Object.keys(
  CEO_REPORT_CATEGORY_LABELS,
) as CeoReportCategory[];

export type CeoReportDefinition = {
  key: string;
  category: CeoReportCategory;
  title: string;
  description: string;
  /** Underlying ReportKey when backed by runReport; null for custom executive packs */
  reportKey: ReportKey | null;
  dataSources: string[];
  defaultColumns: string[];
};

/** Map existing report catalog into executive categories */
const STANDARD: CeoReportDefinition[] = REPORT_DEFINITIONS.map((def) => {
  let category: CeoReportCategory = "organization";
  if (def.module === "attendance") category = "attendance";
  else if (def.module === "leave") category = "leave";
  else if (def.module === "payroll") category = "payroll";
  else if (def.module === "recruitment") category = "recruitment";
  else if (def.module === "performance") category = "performance";
  else if (def.module === "exit") category = "attrition";
  else if (def.key === "hr_department") category = "department";
  else if (def.key === "hr_employee_master" || def.key === "hr_joining") {
    category = "headcount";
  } else if (def.key === "performance_kpi" || def.key === "performance_goals") {
    category = "training";
  } else if (def.module === "hr") category = "organization";

  return {
    key: def.key,
    category,
    title: def.title,
    description: def.description,
    reportKey: def.key,
    dataSources: [def.module],
    defaultColumns: ["metric", "value"],
  };
});

const CUSTOM: CeoReportDefinition[] = [
  {
    key: "ceo_executive_summary",
    category: "executive_summary",
    title: "Executive Summary Pack",
    description: "Leadership snapshot across workforce, hiring, attendance, and payroll.",
    reportKey: null,
    dataSources: ["employees", "attendance", "payroll", "recruitment", "performance"],
    defaultColumns: ["section", "metric", "value"],
  },
  {
    key: "ceo_board_report",
    category: "board",
    title: "Board Presentation Summary",
    description: "Board-ready narrative with KPIs, risks, and period comparisons.",
    reportKey: null,
    dataSources: ["employees", "exit", "payroll", "recruitment", "performance"],
    defaultColumns: ["section", "metric", "value"],
  },
  {
    key: "ceo_compliance_report",
    category: "compliance",
    title: "Compliance Report",
    description: "Attendance compliance, pending leave, and payroll approval posture.",
    reportKey: null,
    dataSources: ["attendance", "leave", "payroll", "audit_logs"],
    defaultColumns: ["section", "metric", "value"],
  },
  {
    key: "ceo_organization_report",
    category: "organization",
    title: "Organization Structure Report",
    description: "Departments, managers, employment types, and headcount mix.",
    reportKey: null,
    dataSources: ["departments", "employees", "branches"],
    defaultColumns: ["section", "metric", "value"],
  },
  {
    key: "ceo_headcount_report",
    category: "headcount",
    title: "Headcount Movement Report",
    description: "Joiners, exits, and net headcount movement for the selected period.",
    reportKey: null,
    dataSources: ["employees"],
    defaultColumns: ["section", "metric", "value"],
  },
  {
    key: "ceo_training_report",
    category: "training",
    title: "Training & Development Report",
    description: "Goal completion and KPI progress used as training effectiveness signals.",
    reportKey: null,
    dataSources: ["performance_goals", "performance_kpis"],
    defaultColumns: ["section", "metric", "value"],
  },
];

export const CEO_REPORT_DEFINITIONS: CeoReportDefinition[] = [...CUSTOM, ...STANDARD];

export function getCeoReportDefinition(key: string) {
  return CEO_REPORT_DEFINITIONS.find((item) => item.key === key) ?? null;
}
