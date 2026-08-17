import type { ManualSection } from "@/lib/help/portal-manual";

export const CEO_PORTAL_MANUAL: ManualSection[] = [
  {
    id: "dashboard",
    group: "Personal",
    title: "Dashboard",
    icon: "layout",
    summary:
      "Executive home view with organization health signals — not a place to edit employee records.",
    useful:
      "Gives a fast scan of headcount, hiring, approvals, and other leadership indicators before opening a module.",
    howTo:
      "Open Dashboard. Read the summary tiles. Use Approvals if items need a decision. Use Reports or Organization for deeper review.",
    features: [
      {
        name: "Leadership snapshot",
        icon: "gauge",
        detail: "High-level counts and trends for the company, not day-to-day HR editing.",
        tip: "Treat this as an overview — details live in each module.",
      },
      {
        name: "Attention items",
        icon: "alert",
        detail: "Items that typically need executive follow-up, such as pending approvals.",
        tip: "Clear Approvals before browsing reports.",
      },
    ],
  },
  {
    id: "my-profile",
    group: "Personal",
    title: "My Profile",
    icon: "user",
    summary: "Your own executive employee profile and contact details.",
    useful: "Keeps your personal contact information accurate for HR and the company.",
    howTo:
      "Open My Profile. Update allowed personal fields. Employment master data is owned by HR.",
    features: [
      {
        name: "Personal details",
        icon: "user",
        detail: "Phone, emergency contact, and other personal fields you can maintain.",
        tip: "Keep phone numbers current, including country code.",
      },
      {
        name: "Identity & employment",
        icon: "badge",
        detail: "Read-only employment identity maintained by HR.",
        tip: "Ask HR if designation or other master fields look wrong.",
      },
    ],
  },
  {
    id: "organization",
    group: "Oversight",
    title: "Organization",
    icon: "building",
    summary:
      "Company structure overview — branches, departments, and hierarchy for leadership visibility.",
    useful:
      "Helps you understand how the company is structured without editing operational HR master data day to day.",
    howTo:
      "Open Organization. Review company profile, branches, and hierarchy. HR owns most structural edits; this portal is for monitoring.",
    features: [
      {
        name: "Company profile",
        icon: "building",
        detail: "Organization identity, branding, and company-level details visible to leadership.",
        tip: "Use this to confirm legal name and company identity, not to run payroll.",
      },
      {
        name: "Structure & hierarchy",
        icon: "git-branch",
        detail: "How departments and reporting lines sit together.",
        tip: "Useful before discussing headcount or reporting changes with HR.",
      },
    ],
  },
  {
    id: "recruitment",
    group: "Oversight",
    title: "Recruitment",
    icon: "briefcase",
    summary:
      "Hiring pipeline visibility for leadership — jobs, candidates, and stages that need executive view.",
    useful:
      "Lets you see hiring progress and CEO-stage candidates without running the full HR recruitment console.",
    howTo:
      "Open Recruitment. Review openings and pipeline. Candidate decisions at CEO stage and offers may appear here for oversight.",
    features: [
      {
        name: "Openings overview",
        icon: "briefcase",
        detail: "Roles currently in hiring that leadership can see.",
        tip: "Confirm priority roles with HR before interviewing.",
      },
      {
        name: "Pipeline & CEO stage",
        icon: "user-search",
        detail: "Candidates moving through stages, including those waiting for executive review.",
        tip: "CEO-stage items often also appear under Approvals.",
      },
    ],
  },
  {
    id: "performance",
    group: "Oversight",
    title: "Performance",
    icon: "target",
    summary: "Organization performance overview — goals, reviews, and promotion signals.",
    useful:
      "Gives leadership visibility into how teams are tracking, without replacing manager 1:1s.",
    howTo:
      "Open Performance. Review goals and related sections at company or leadership scope. Detailed coaching stays with managers and HR.",
    features: [
      {
        name: "Goals & OKRs",
        icon: "target",
        detail: "Goal progress visible at executive scope.",
        tip: "Use this for direction, not for editing every employee goal.",
      },
      {
        name: "Review signals",
        icon: "activity",
        detail: "KPI, feedback, or promotion-related views available to leadership.",
        tip: "Escalate people decisions through HR and managers.",
      },
    ],
  },
  {
    id: "attendance",
    group: "Oversight",
    title: "Attendance",
    icon: "calendar-check",
    summary: "Company attendance visibility — presence trends, not personal check-in.",
    useful:
      "Helps leadership see attendance health and exceptions across the organization.",
    howTo:
      "Open Attendance. Review presence, late, and absence patterns. Day-to-day punch management stays with HR and managers.",
    features: [
      {
        name: "Presence overview",
        icon: "calendar",
        detail: "Org-level present / late / absent / leave picture.",
        tip: "Look for unusual spikes, then ask HR or managers for context.",
      },
      {
        name: "Trends",
        icon: "line-chart",
        detail: "Attendance over a period for leadership review.",
        tip: "Pair with Reports if you need an exportable summary.",
      },
    ],
  },
  {
    id: "approvals",
    group: "Oversight",
    title: "Approvals",
    icon: "check-square",
    summary:
      "Items that need an executive decision — general, leave, and exit approvals.",
    useful:
      "This is the action queue for the Executive Portal. Start here when something is waiting on you.",
    howTo:
      "Open Approvals. Switch between Executive, Leave, and Exit. Open an item, read the summary, then approve or reject as required. There are no module redirect links in this guide.",
    features: [
      {
        name: "Executive approvals",
        icon: "check-square",
        detail: "Leadership decisions such as hiring or other executive-gated items.",
        tip: "Read the context HR prepared before deciding.",
      },
      {
        name: "Leave approvals",
        icon: "calendar",
        detail: "Leave requests that require executive sign-off when policy routes them here.",
        tip: "Check overlapping coverage if the person is senior or critical.",
      },
      {
        name: "Exit approvals",
        icon: "clipboard",
        detail: "Resignation / exit items that need executive acknowledgement or approval.",
        tip: "HR still owns the operational exit checklist.",
      },
    ],
  },
  {
    id: "company-payroll",
    group: "Oversight",
    title: "Company Payroll",
    icon: "wallet",
    summary:
      "Leadership view of company payroll — not your personal payslip editor.",
    useful:
      "Lets you review payroll health and published runs at company level.",
    howTo:
      "Open Company Payroll. Review published or in-progress runs at executive scope. HR operates the payroll run; this portal is for oversight.",
    features: [
      {
        name: "Payroll overview",
        icon: "banknote",
        detail: "Company-level payroll status and summaries visible to leadership.",
        tip: "Questions about a single employee’s payslip should go to HR.",
      },
      {
        name: "Run visibility",
        icon: "receipt",
        detail: "See whether a cycle is drafted, processing, or published.",
        tip: "Do not treat this as a place to edit salary structures.",
      },
    ],
  },
  {
    id: "reports",
    group: "Oversight",
    title: "Reports",
    icon: "bar-chart",
    summary: "Leadership reports and analytics summaries for the organization.",
    useful:
      "Exportable or reviewable views for board, planning, and monthly leadership reviews.",
    howTo:
      "Open Reports. Choose the topic (workforce, hiring, attendance, performance, payroll). Set a date range and review. Analytics-style charts may appear as part of this oversight set.",
    features: [
      {
        name: "Workforce & hiring",
        icon: "users",
        detail: "Headcount and recruitment summaries for leadership.",
        tip: "Use before headcount or hiring discussions with HR.",
      },
      {
        name: "Attendance & performance",
        icon: "line-chart",
        detail: "Presence and performance summaries at company scope.",
        tip: "Drill into Approvals or HR if a number needs action.",
      },
      {
        name: "Payroll summaries",
        icon: "pie",
        detail: "High-level payroll reporting for executives.",
        tip: "Detailed payslip issues belong with HR.",
      },
    ],
  },
  {
    id: "notifications",
    group: "Personal",
    title: "Notifications",
    icon: "bell",
    summary: "Alerts for approvals, provisioning, and other executive updates.",
    useful: "Tells you when something is waiting without opening every module.",
    howTo:
      "Open Notifications. Read the center for unread items, then History for older alerts.",
    features: [
      {
        name: "Notification center",
        icon: "bell",
        detail: "Current alerts, including approval and provisioning messages.",
        tip: "Unread approval alerts usually mean work in Approvals.",
      },
      {
        name: "History",
        icon: "clock",
        detail: "Older notifications you already read.",
        tip: "Use history if you missed an earlier decision request.",
      },
    ],
  },
  {
    id: "user-provisioning",
    group: "Oversight",
    title: "User Provisioning",
    icon: "user-plus",
    summary:
      "Invite executive / portal users. Employee master records still belong to HR.",
    useful:
      "Lets leadership grant portal access for the right people without editing the employee directory.",
    howTo:
      "Open User Provisioning. Invite a user and assign the intended portal/role. Do not use this to create employee master data — HR does that.",
    features: [
      {
        name: "Invite user",
        icon: "user-plus",
        detail: "Send a portal invite with the correct role and portal access.",
        tip: "Double-check email and role before sending.",
      },
      {
        name: "Access lifecycle",
        icon: "key",
        detail: "See invited users and whether they have accepted access.",
        tip: "Resend or revoke only when you intend to change login access.",
      },
    ],
  },
  {
    id: "settings",
    group: "Personal",
    title: "Settings",
    icon: "settings",
    summary: "Your portal preferences and account security.",
    useful: "Reset your password and adjust personal preferences for this portal.",
    howTo:
      "Open Settings. Use Account & security for password reset (max 3 emails per day). Company-wide settings stay with HR / Super Admin.",
    features: [
      {
        name: "Preferences",
        icon: "sliders",
        detail: "Personal display or notification preferences for your login.",
        tip: "These do not change company policy.",
      },
      {
        name: "Account & security",
        icon: "shield",
        detail: "Request a password reset email, limited to 3 per day.",
        tip: "If the limit is reached, wait until tomorrow or contact HR.",
      },
    ],
  },
];
