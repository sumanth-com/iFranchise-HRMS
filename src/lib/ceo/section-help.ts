import type { SectionHelpPoint } from "@/components/common/section-help-button";

export const CEO_SECTION_HELP_DESCRIPTION = "Quick reference for this section.";

export const CEO_APPROVALS_SECTION_HELP = {
  executive: {
    title: "About Executive Approvals",
    points: [
      {
        label: "What this page is for",
        detail:
          "Review strategic requests that need CEO authorization — hiring, budget, promotions, and organization changes.",
      },
      {
        label: "What to act on first",
        detail:
          "Start with overdue, high-priority, and escalated items. Open a request in the queue to approve, reject, clarify, or forward.",
      },
      {
        label: "Tabs",
        detail:
          "Executive is strategic approvals. Leave is time-off waiting on you. Exit is resignations that already cleared manager and HR.",
      },
    ] satisfies SectionHelpPoint[],
  },
  filters: {
    title: "About Approval Filters",
    points: [
      {
        label: "Type",
        detail: "Narrow by the kind of request, such as budget, hiring, or promotion.",
      },
      {
        label: "Priority",
        detail: "Focus on critical or high items when the queue is long.",
      },
      {
        label: "Status",
        detail:
          "Pending CEO and Escalated need a decision. Approved and Rejected are history.",
      },
      {
        label: "Department",
        detail: "See requests from one department only.",
      },
    ] satisfies SectionHelpPoint[],
  },
  queue: {
    title: "About the Approval Queue",
    points: [
      {
        label: "Open a request",
        detail:
          "Click the request code or View to see details, documents, and take action.",
      },
      {
        label: "Decisions",
        detail:
          "Approve, reject, ask for clarification, request a revision, or forward to another reviewer.",
      },
    ] satisfies SectionHelpPoint[],
  },
  leave: {
    title: "About Leave Approvals",
    points: [
      {
        label: "What this page is for",
        detail:
          "Approve leave requests that have been routed to you. Employee and manager requests usually go through manager and HR first.",
      },
      {
        label: "Actions",
        detail: "Open a request to approve, reject, or forward it to a manager or HR.",
      },
    ] satisfies SectionHelpPoint[],
  },
  exit: {
    title: "About Exit Approvals",
    points: [
      {
        label: "What this page is for",
        detail:
          "Give final CEO approval on resignations already cleared by the manager and HR.",
      },
      {
        label: "After you approve",
        detail: "Clearance starts for the employee. Rejecting stops the exit at this stage.",
      },
    ] satisfies SectionHelpPoint[],
  },
} as const;

export const CEO_ANALYTICS_SECTION_HELP = {
  overview: {
    title: "About Executive Analytics",
    points: [
      {
        label: "What this page is for",
        detail:
          "See company health at a glance — retention, attendance, payroll trend, and signals that need attention.",
      },
      {
        label: "Tabs",
        detail:
          "Overview is the snapshot. Workforce, Hiring, Attendance, Performance, and Payroll open the detailed charts for that area.",
      },
      {
        label: "Export",
        detail: "Download the current filtered view as PDF or Excel.",
      },
    ] satisfies SectionHelpPoint[],
  },
  filters: {
    title: "About Analytics Filters",
    points: [
      {
        label: "Date range",
        detail: "Set the start and end dates for the metrics and charts.",
      },
      {
        label: "Department",
        detail: "Limit the view to one department, or keep all departments.",
      },
      {
        label: "Manager",
        detail: "Limit the view to one manager’s team, or keep all managers.",
      },
    ] satisfies SectionHelpPoint[],
  },
  insights: {
    title: "About Executive Insights",
    points: [
      {
        label: "What this is",
        detail:
          "Priority signals across workforce, hiring, attendance, and payroll for the selected period.",
      },
      {
        label: "Priority",
        detail: "High items need attention first. Medium and low are watch items.",
      },
    ] satisfies SectionHelpPoint[],
  },
  workforce: {
    title: "About Workforce Analytics",
    points: [
      {
        label: "What this shows",
        detail: "Headcount growth, department mix, joining trend, and average tenure.",
      },
    ] satisfies SectionHelpPoint[],
  },
  hiring: {
    title: "About Hiring Analytics",
    points: [
      {
        label: "What this shows",
        detail: "Open roles, funnel progress, time to hire, and hiring by department.",
      },
    ] satisfies SectionHelpPoint[],
  },
  attendance: {
    title: "About Attendance Analytics",
    points: [
      {
        label: "What this shows",
        detail: "Attendance compliance, late and leave load, and department trends.",
      },
    ] satisfies SectionHelpPoint[],
  },
  performance: {
    title: "About Performance Analytics",
    points: [
      {
        label: "What this shows",
        detail: "Ratings, goal completion, and teams that may need support.",
      },
    ] satisfies SectionHelpPoint[],
  },
  payroll: {
    title: "About Payroll Analytics",
    points: [
      {
        label: "What this shows",
        detail: "Payroll cost trend, department spend, bonuses, and benefits.",
      },
    ] satisfies SectionHelpPoint[],
  },
} as const;
