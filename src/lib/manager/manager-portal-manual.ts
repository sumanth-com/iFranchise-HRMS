/**
 * Manager Portal help manual — explanatory copy only (no route links).
 * Covers every sidebar module and key inner sections.
 */

import type { ManualSection } from "@/lib/help/portal-manual";

export type { ManualFeature, ManualSection } from "@/lib/help/portal-manual";

export const MANAGER_PORTAL_MANUAL: ManualSection[] = [
  {
    id: "dashboard",
    group: "Self-service",
    title: "Dashboard",
    icon: "layout",
    summary:
      "Your personal home screen. It shows your own attendance, leave, and quick status — not the whole team.",
    useful:
      "Use it at the start of the day to see your personal numbers before you open team tools under Administration.",
    howTo:
      "Open Dashboard from Self-service. Read the KPI tiles (attendance, hours, leave balance, pending leave). If something needs action for you personally, open that module from the sidebar.",
    features: [
      {
        name: "Personal KPI tiles",
        icon: "gauge",
        detail:
          "Shows your attendance status, working hours, leave balance, and how many of your leave requests are still pending.",
        tip: "These numbers are only about you — not your teammates.",
      },
      {
        name: "Quick focus items",
        icon: "zap",
        detail:
          "Highlights the next personal actions for your day (for example pending leave or attendance follow-up).",
        tip: "Treat this as a personal checklist, separate from Manager Overview.",
      },
    ],
  },
  {
    id: "my-profile",
    group: "Self-service",
    title: "My Profile",
    icon: "user",
    summary:
      "Your employee profile page — contact details, personal info, and employment identity maintained by HR.",
    useful:
      "Keeps your phone and emergency contact correct so HR and your team can reach you when needed.",
    howTo:
      "Open My Profile. Update only the fields you are allowed to edit (usually personal phone and emergency contact). Employment fields like designation or joining date are read-only and owned by HR.",
    features: [
      {
        name: "Personal details",
        icon: "user",
        detail:
          "Your name, phone (with country code), emergency contact, and other personal fields you can maintain.",
        tip: "Update phone numbers whenever they change so payroll and alerts stay accurate.",
      },
      {
        name: "Identity & employment",
        icon: "badge",
        detail:
          "Company-managed fields such as employee ID, department, designation, and employment status.",
        tip: "If something looks wrong here, ask HR — managers cannot edit master employment data from this page.",
      },
    ],
  },
  {
    id: "attendance",
    group: "Self-service",
    title: "Attendance",
    icon: "calendar-check",
    summary:
      "Your own check-in / check-out and personal attendance history. This is not Team Attendance.",
    useful:
      "Lets you mark your presence and review your late / absent / correction history for yourself only.",
    howTo:
      "Open Attendance under Self-service. Check in when you start work and check out when you finish. Use history to review past days. Use Team Attendance under Administration when you need your team’s status.",
    features: [
      {
        name: "Check in / check out",
        icon: "log-in",
        detail:
          "Buttons to mark when you start and end work for the day according to company policy.",
        tip: "Do this for yourself here; teammates’ punches appear under Team Attendance.",
      },
      {
        name: "My attendance history",
        icon: "history",
        detail:
          "Past days with status (present, late, absent, leave) and working hours for your account.",
        tip: "Use this before payroll or reviews if you need to confirm your own record.",
      },
      {
        name: "Corrections",
        icon: "wrench",
        detail:
          "Request a fix when a punch is missing or wrong (when correction workflow is enabled).",
        tip: "Submit corrections early so they can be reviewed before payroll closes.",
      },
    ],
  },
  {
    id: "payroll",
    group: "Self-service",
    title: "Payroll",
    icon: "wallet",
    summary:
      "Your payslips and published payroll history after HR runs payroll for the month.",
    useful:
      "Lets you download and review your own salary documents without asking HR for each copy.",
    howTo:
      "Open Payroll under Self-service. When a month is published, open the payslip and download if needed. Older months stay under history. Team payroll is not managed from this page.",
    features: [
      {
        name: "Current payslip",
        icon: "receipt",
        detail:
          "Latest published payslip for you, with earnings and deductions when available.",
        tip: "Payslips appear only after HR publishes that month — empty usually means not published yet.",
      },
      {
        name: "Payroll history",
        icon: "archive",
        detail: "Previous months’ payslips you can browse and download again.",
        tip: "Use history for past claims, loans, or tax references.",
      },
      {
        name: "Payroll policy",
        icon: "book",
        detail:
          "Read-only notes about how payroll works for employees (cut-offs, rules) when shown.",
        tip: "Policy explains rules; it does not change your payslip amounts.",
      },
    ],
  },
  {
    id: "documents",
    group: "Self-service",
    title: "Documents",
    icon: "file-text",
    summary:
      "Letters and files shared with you personally (offer letters, policies, certificates, etc.).",
    useful:
      "Gives you a single place to find documents issued to you without chasing HR each time.",
    howTo:
      "Open Documents under Self-service. Browse the list, then preview or download a file. Only documents shared with your account appear here.",
    features: [
      {
        name: "Document list",
        icon: "files",
        detail: "All documents currently available on your employee account.",
        tip: "If a letter is missing, ask HR to publish or share it to your profile.",
      },
      {
        name: "Preview & download",
        icon: "download",
        detail: "Open a document in the browser or save a copy to your device.",
        tip: "Keep downloads secure — they may contain personal or company information.",
      },
    ],
  },
  {
    id: "leave",
    group: "Self-service",
    title: "Leave",
    icon: "calendar-days",
    summary:
      "Your personal leave balance, calendar, and leave requests. Team Leave is a different module.",
    useful:
      "Apply for your own time off and track approvals. Do not use this page to manage teammate leave.",
    howTo:
      "Open Leave under Self-service. Check balance, apply with dates and type, then track status. For your team’s leave, use Team Leave under Administration.",
    features: [
      {
        name: "Leave balance",
        icon: "wallet",
        detail: "Remaining days by leave type (casual, sick, earned, etc.) for you.",
        tip: "Balance updates after approvals and policy accruals.",
      },
      {
        name: "Apply leave",
        icon: "plus",
        detail:
          "Create a request with leave type, start/end dates, reason, and any required notes.",
        tip: "Apply early for planned leave so approvers have time to respond.",
      },
      {
        name: "My leave requests",
        icon: "list",
        detail: "All of your requests with pending, approved, or rejected status.",
        tip: "Pending means waiting for approval — check Notifications for updates.",
      },
      {
        name: "Leave policy",
        icon: "scroll",
        detail: "Company leave rules that apply to your role (eligibility, carry forward, etc.).",
        tip: "Read policy before applying if you are unsure about a leave type.",
      },
    ],
  },
  {
    id: "my-goals",
    group: "Self-service",
    title: "My Goals",
    icon: "target",
    summary:
      "Your personal performance workspace: goals, KPIs, feedback, 1:1s, and promotion items about you.",
    useful:
      "Track your own growth and reviews. Coaching your team happens under Administration → Performance.",
    howTo:
      "Open My Goals under Self-service. Move between Goals, KPIs, Feedback, 1:1s, and Promotions tabs. Update only your own items unless a review workflow asks otherwise.",
    features: [
      {
        name: "Goals & OKRs",
        icon: "target",
        detail: "Goals assigned to you for the current cycle, with progress and status.",
        tip: "Keep progress updated before review meetings.",
      },
      {
        name: "KPIs",
        icon: "activity",
        detail: "Measurable indicators tied to your role and performance cycle.",
        tip: "KPIs explain how success is measured for your role.",
      },
      {
        name: "Feedback",
        icon: "message",
        detail: "Feedback shared with you from managers or review processes.",
        tip: "Use feedback notes to prepare for 1:1s and goal updates.",
      },
      {
        name: "1:1 Meetings",
        icon: "users-round",
        detail: "Your 1:1 notes, agendas, and follow-ups.",
        tip: "Capture action items so they do not get lost between meetings.",
      },
      {
        name: "Promotions",
        icon: "trending",
        detail: "Promotion-related records that involve your own career path.",
        tip: "This is your record — team promotion work sits under Performance.",
      },
    ],
  },
  {
    id: "assets",
    group: "Self-service",
    title: "Assets",
    icon: "laptop",
    summary:
      "Company equipment assigned to you — laptop, phone, accessories, and similar items.",
    useful:
      "Confirms what you hold so you can report damage, loss, or return needs to HR quickly.",
    howTo:
      "Open Assets under Self-service. Review the assigned list and open an item for type, status, and assignment details. Report issues to HR outside this guide.",
    features: [
      {
        name: "Assigned assets list",
        icon: "laptop",
        detail: "Every asset currently linked to your employee record.",
        tip: "If an item you hold is missing from the list, tell HR.",
      },
      {
        name: "Asset details",
        icon: "info",
        detail: "Type, status, serial/identity info, and assignment date when available.",
        tip: "Check details before returning or transferring equipment.",
      },
    ],
  },
  {
    id: "notifications",
    group: "Self-service",
    title: "Notifications",
    icon: "bell",
    summary:
      "Alerts for leave decisions, attendance notes, recruitment tasks, and other portal updates.",
    useful:
      "Keeps you informed without checking every module manually.",
    howTo:
      "Open Notifications under Self-service. Read unread items in the center, then use History for older alerts. Mark items read as you clear them.",
    features: [
      {
        name: "Notification center",
        icon: "bell",
        detail: "Current and recent alerts that need your attention.",
        tip: "Clear unread items regularly so important approvals are not missed.",
      },
      {
        name: "Notification history",
        icon: "clock",
        detail: "Older notifications you may have already read or dismissed.",
        tip: "Use history when you need to find an older leave or recruitment alert.",
      },
    ],
  },
  {
    id: "settings",
    group: "Self-service",
    title: "Settings",
    icon: "settings",
    summary:
      "Your portal preferences and account security (including password reset).",
    useful:
      "Lets you adjust personal preferences and securely reset your login when needed.",
    howTo:
      "Open Settings under Self-service. Change preferences if available. For password reset, open Account & security and request a reset email. You can request up to 3 reset emails per day.",
    features: [
      {
        name: "Preferences",
        icon: "sliders",
        detail: "Display / sound / notification preferences for your account when available.",
        tip: "Preferences affect only your login experience, not team settings.",
      },
      {
        name: "Account & security",
        icon: "shield",
        detail:
          "Request a password reset email. Daily limit is 3 requests for security.",
        tip: "If the limit is reached, wait until tomorrow or contact HR for help.",
      },
    ],
  },
  {
    id: "manager-overview",
    group: "Administration",
    title: "Manager Overview",
    icon: "layout",
    summary:
      "Team dashboard for managers — presence, leave pressure, and health signals for your reporting line.",
    useful:
      "Gives one place to see what needs attention across your team before opening each module.",
    howTo:
      "Open Manager Overview under Administration. Read team counts and focus areas. Then open Teammates, Team Attendance, or Team Leave for the detailed work.",
    features: [
      {
        name: "Team snapshot",
        icon: "gauge",
        detail:
          "High-level counts such as team size, present today, on leave, late, and pending leave approvals.",
        tip: "Use this as a morning scan of your team’s health.",
      },
      {
        name: "Focus areas",
        icon: "alert",
        detail:
          "Exceptions that usually need a manager’s follow-up (pending leave, attendance issues, etc.).",
        tip: "Start with red / pending items before browsing full lists.",
      },
    ],
  },
  {
    id: "teammates",
    group: "Administration",
    title: "Teammates",
    icon: "users",
    summary:
      "Directory of people in your reporting hierarchy — who reports to you and how the team is structured.",
    useful:
      "Find teammates quickly, open profiles, and understand reporting lines before attendance or performance work.",
    howTo:
      "Open Teammates under Administration. Browse the directory, search or filter if needed, then open a member profile for role and employment details in your scope.",
    features: [
      {
        name: "Team directory",
        icon: "search",
        detail:
          "List of people under your management scope with basic role and status information.",
        tip: "If someone is missing, they may sit outside your reporting hierarchy — ask HR.",
      },
      {
        name: "Member profile",
        icon: "user",
        detail:
          "Teammate profile view with key employment details you are allowed to see as their manager.",
        tip: "Use this before 1:1s, leave discussions, or performance reviews.",
      },
      {
        name: "Hierarchy context",
        icon: "git-branch",
        detail: "How people sit under your reporting line (direct and nested reports where shown).",
        tip: "Helps you know who you can see in Team Attendance and Team Leave.",
      },
    ],
  },
  {
    id: "team-attendance",
    group: "Administration",
    title: "Team Attendance",
    icon: "calendar-check",
    summary:
      "Attendance board for your team — who is present, late, absent, or on leave. Not your personal punches.",
    useful:
      "Monitor daily presence and follow up on exceptions across people you manage.",
    howTo:
      "Open Team Attendance under Administration. Review today’s statuses, filter by status or person, then open a member for history. Use Self-service → Attendance only for your own check-in.",
    features: [
      {
        name: "Today’s team board",
        icon: "calendar",
        detail:
          "Present / late / absent / leave status for teammates in your scope for the selected day.",
        tip: "Scan late and absent first, then confirm planned leave.",
      },
      {
        name: "Member attendance detail",
        icon: "history",
        detail: "One person’s attendance pattern over days or a date range.",
        tip: "Use this when discussing repeated lateness or missing punches.",
      },
      {
        name: "Filters & export",
        icon: "filter",
        detail:
          "Narrow the list by status, employee, or date range, and export when available.",
        tip: "Exports help for weekly reviews or escalation notes.",
      },
    ],
  },
  {
    id: "team-leave",
    group: "Administration",
    title: "Team Leave",
    icon: "calendar-days",
    summary:
      "Leave for people in your team — planned absences and requests waiting for a decision.",
    useful:
      "Lets you see coverage risk and act on teammate leave without using your personal Leave page.",
    howTo:
      "Open Team Leave under Administration. Filter to pending if you need to approve or review. Open a request for dates, type, reason, and status. Your own leave stays under Self-service → Leave.",
    features: [
      {
        name: "Team leave list",
        icon: "list",
        detail: "Leave requests across teammates in your reporting scope.",
        tip: "Sort or filter by date when planning coverage for the week.",
      },
      {
        name: "Pending approvals",
        icon: "check",
        detail: "Requests still waiting for a manager or approver decision.",
        tip: "Clear pending items promptly so teammates can plan travel or coverage.",
      },
      {
        name: "Leave request detail",
        icon: "file-text",
        detail:
          "Full request view: leave type, dates, reason, status, and related notes.",
        tip: "Read the reason and overlapping team leave before approving.",
      },
    ],
  },
  {
    id: "performance",
    group: "Administration",
    title: "Performance",
    icon: "target",
    summary:
      "Team performance workspace — goals, KPIs, feedback, 1:1s, and promotions for people you manage.",
    useful:
      "Coach and review your team in one place. Your personal goals remain under Self-service → My Goals.",
    howTo:
      "Open Performance under Administration. Pick a teammate, then use Goals, KPIs, Feedback, 1:1s, or Promotions. Keep notes updated after each review conversation.",
    features: [
      {
        name: "Goals & OKRs",
        icon: "target",
        detail: "Goals for teammates in the current cycle, with progress tracking.",
        tip: "Align goals with team priorities before the cycle starts.",
      },
      {
        name: "KPIs",
        icon: "activity",
        detail: "Measurable indicators for people you manage.",
        tip: "Use KPIs in reviews so feedback stays objective.",
      },
      {
        name: "Feedback",
        icon: "message",
        detail: "Capture or review feedback for team members.",
        tip: "Write feedback soon after the event so details stay accurate.",
      },
      {
        name: "1:1 Meetings",
        icon: "users-round",
        detail: "Structured check-ins and follow-ups with your reports.",
        tip: "Carry open actions from one 1:1 into the next.",
      },
      {
        name: "Promotions",
        icon: "trending",
        detail: "Promotion-related items involving people on your team.",
        tip: "Coordinate with HR for final promotion decisions and paperwork.",
      },
    ],
  },
  {
    id: "recruitment",
    group: "Administration",
    title: "Recruitment",
    icon: "briefcase",
    summary:
      "Hiring work in your manager scope — jobs, candidates, interviews, and offers you are involved in.",
    useful:
      "Supports openings for your team without needing the full company-wide HR recruitment console.",
    howTo:
      "Open Recruitment under Administration. Move between Jobs, Candidates, Interviews, and Offers. Complete interview evaluations assigned to you and leave clear notes for HR.",
    features: [
      {
        name: "Jobs",
        icon: "briefcase",
        detail: "Open roles related to your hiring involvement.",
        tip: "Confirm role requirements with HR before interviewing.",
      },
      {
        name: "Candidates",
        icon: "user-search",
        detail: "People moving through the pipeline for roles you can see.",
        tip: "Review candidate profiles before interview day.",
      },
      {
        name: "Interviews",
        icon: "mic",
        detail: "Interview stages and evaluation tasks assigned to you.",
        tip: "Submit scores and notes promptly so the pipeline can move.",
      },
      {
        name: "Offers",
        icon: "handshake",
        detail: "Offer-related items that appear in your manager scope.",
        tip: "Final offer issuance is typically owned by HR — use this to stay informed.",
      },
    ],
  },
  {
    id: "reports",
    group: "Administration",
    title: "Reports",
    icon: "bar-chart",
    summary:
      "Manager reports for attendance, leave, performance, recruitment, and team summaries in your scope.",
    useful:
      "Gives exportable or reviewable summaries for planning, reviews, and escalation — limited to your team.",
    howTo:
      "Open Reports under Administration. Choose Attendance, Leave, Performance, Recruitment, or Team. Set the date range, review the summary, then export if needed.",
    features: [
      {
        name: "Attendance reports",
        icon: "bar-chart",
        detail: "Team presence and exception summaries over a selected period.",
        tip: "Use monthly attendance reports before performance discussions.",
      },
      {
        name: "Leave reports",
        icon: "pie",
        detail: "Leave usage and request patterns for your team.",
        tip: "Helpful for coverage planning around holidays and peak seasons.",
      },
      {
        name: "Performance reports",
        icon: "line-chart",
        detail: "High-level performance summaries for people you manage.",
        tip: "Pair with Performance module details before review meetings.",
      },
      {
        name: "Recruitment reports",
        icon: "briefcase",
        detail: "Hiring funnel summaries within your involvement.",
        tip: "Use when you need status for open roles without opening each candidate.",
      },
      {
        name: "Team reports",
        icon: "users",
        detail: "Broader team summaries available to managers in this portal.",
        tip: "Good starting point for weekly leadership updates.",
      },
    ],
  },
];
