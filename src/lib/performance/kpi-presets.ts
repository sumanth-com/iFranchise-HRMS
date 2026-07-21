import type { KpiMeasurementType, KpiPeriod } from "@/types/performance";

export type KpiPreset = {
  id: string;
  name: string;
  description: string;
  measurementType: KpiMeasurementType;
  targetValue: number;
  weightage: number;
  kpiPeriod: KpiPeriod;
};

/** Curated KPI templates — common cases only. */
export const BUILTIN_KPI_PRESETS: KpiPreset[] = [
  {
    id: "sales-target",
    name: "Sales Target",
    description: "Monthly revenue or units sold.",
    measurementType: "currency",
    targetValue: 500000,
    weightage: 30,
    kpiPeriod: "monthly",
  },
  {
    id: "revenue-growth",
    name: "Revenue Growth",
    description: "Quarterly growth percentage.",
    measurementType: "percentage",
    targetValue: 15,
    weightage: 25,
    kpiPeriod: "quarterly",
  },
  {
    id: "customer-satisfaction",
    name: "Customer Satisfaction",
    description: "Average customer rating.",
    measurementType: "rating",
    targetValue: 4.5,
    weightage: 20,
    kpiPeriod: "quarterly",
  },
  {
    id: "on-time-delivery",
    name: "On-Time Delivery",
    description: "Projects delivered on schedule.",
    measurementType: "percentage",
    targetValue: 95,
    weightage: 25,
    kpiPeriod: "quarterly",
  },
  {
    id: "attendance-rate",
    name: "Attendance Rate",
    description: "Team attendance percentage.",
    measurementType: "percentage",
    targetValue: 98,
    weightage: 15,
    kpiPeriod: "monthly",
  },
  {
    id: "task-completion",
    name: "Task Completion",
    description: "Tasks finished on time.",
    measurementType: "percentage",
    targetValue: 90,
    weightage: 20,
    kpiPeriod: "monthly",
  },
];

export function getDefaultKpiDates(period: KpiPeriod): { startDate: string; endDate: string } {
  const start = new Date();
  const end = new Date(start);

  switch (period) {
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      break;
    case "half_yearly":
      end.setMonth(end.getMonth() + 6);
      break;
    case "annual":
      end.setFullYear(end.getFullYear() + 1);
      break;
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
