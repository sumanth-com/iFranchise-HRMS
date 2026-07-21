import type { GoalPriority } from "@/types/performance";

export type GoalPreset = {
  id: string;
  title: string;
  description: string;
  category: string;
  goalPriority: GoalPriority;
  weightage: number;
  milestones: string[];
  dueInDays: number;
};

/** Curated goal / OKR templates — common cases only. */
export const BUILTIN_GOAL_PRESETS: GoalPreset[] = [
  {
    id: "revenue-growth",
    title: "Increase Revenue",
    description: "Grow revenue through pipeline and deal closure.",
    category: "Business",
    goalPriority: "high",
    weightage: 30,
    milestones: ["Review pipeline", "Close priority deals"],
    dueInDays: 90,
  },
  {
    id: "product-launch",
    title: "Ship Product Milestone",
    description: "Deliver a planned release on schedule.",
    category: "Technical",
    goalPriority: "high",
    weightage: 25,
    milestones: ["Complete development", "Release to production"],
    dueInDays: 90,
  },
  {
    id: "customer-satisfaction",
    title: "Improve Customer Satisfaction",
    description: "Raise satisfaction through better service.",
    category: "Customer Success",
    goalPriority: "high",
    weightage: 25,
    milestones: ["Collect feedback", "Fix top issues"],
    dueInDays: 90,
  },
  {
    id: "team-mentorship",
    title: "Develop Team Members",
    description: "Coach and support team growth.",
    category: "Leadership",
    goalPriority: "medium",
    weightage: 15,
    milestones: ["Set development plans", "Monthly check-ins"],
    dueInDays: 90,
  },
  {
    id: "certification",
    title: "Complete Certification",
    description: "Finish a learning or certification program.",
    category: "Personal Development",
    goalPriority: "medium",
    weightage: 10,
    milestones: ["Enroll in program", "Pass assessment"],
    dueInDays: 120,
  },
  {
    id: "process-improvement",
    title: "Improve Team Process",
    description: "Remove bottlenecks in how work gets done.",
    category: "Business",
    goalPriority: "medium",
    weightage: 15,
    milestones: ["Map workflow", "Implement improvement"],
    dueInDays: 60,
  },
];

export function getDefaultGoalDueDate(days = 90): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
