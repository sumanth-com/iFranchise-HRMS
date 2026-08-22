/** HR portal hub routes — personal vs team administration paths. */
export const HR_HUB_ROUTES = {
  myAttendance: "/dashboard/attendance",
  teamAttendance: "/dashboard/attendance/team",
  myLeave: "/dashboard/leave",
  teamLeave: "/dashboard/leave/team",
  myPayroll: "/dashboard/payroll",
  teamPayroll: "/dashboard/payroll/team/run",
  myDocuments: "/dashboard/documents",
  teamDocuments: "/dashboard/documents/team",
  myAssets: "/dashboard/assets",
  teamAssets: "/dashboard/assets/team",
  myGoals: "/dashboard/my-goals",
} as const;

export const HR_MY_GOALS_SUB_NAV = [
  { title: "Goals & OKRs", href: HR_HUB_ROUTES.myGoals },
  { title: "KPIs", href: `${HR_HUB_ROUTES.myGoals}/kpis` },
  { title: "Feedback", href: `${HR_HUB_ROUTES.myGoals}/feedback` },
  { title: "1:1 Meetings", href: `${HR_HUB_ROUTES.myGoals}/one-on-ones` },
  { title: "Promotions", href: `${HR_HUB_ROUTES.myGoals}/promotions` },
] as const;
