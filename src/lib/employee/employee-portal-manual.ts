import type { ManualSection } from "@/lib/help/portal-manual";

export const EMPLOYEE_PORTAL_MANUAL: ManualSection[] = [
  {
    id: "dashboard",
    group: "Self-service",
    title: "Dashboard",
    icon: "layout",
    summary:
      "Your home screen. It shows your attendance, leave, and other personal status at a glance.",
    useful:
      "Start here each day to see what needs your attention before opening Attendance, Leave, or Payroll.",
    howTo:
      "Open Dashboard. Read the KPI tiles. If a number looks off (pending leave, hours), open that module from the sidebar.",
    features: [
      {
        name: "Personal KPI tiles",
        icon: "gauge",
        detail:
          "Shows your attendance, working hours, leave balance, and pending leave requests.",
        tip: "These numbers are only about you.",
      },
      {
        name: "Quick focus",
        icon: "zap",
        detail: "Highlights next personal actions such as pending leave or attendance follow-up.",
        tip: "Treat this as a short daily checklist.",
      },
    ],
  },
  {
    id: "my-profile",
    group: "Self-service",
    title: "My Profile",
    icon: "user",
    summary:
      "Your employee profile — contact details, personal info, and employment identity maintained by HR.",
    useful:
      "Keeps your phone and emergency contact accurate so HR can reach you.",
    howTo:
      "Open My Profile. Update allowed personal fields (usually phone and emergency contact). Employment fields like designation are read-only.",
    features: [
      {
        name: "Personal details",
        icon: "user",
        detail:
          "Name, phone (with country code), emergency contact, and other personal fields you can maintain.",
        tip: "Update phone numbers whenever they change.",
      },
      {
        name: "Identity & employment",
        icon: "badge",
        detail:
          "Employee ID, department, designation, and status that HR maintains.",
        tip: "If something looks wrong, contact HR — you cannot edit master employment data here.",
      },
    ],
  },
  {
    id: "attendance",
    group: "Self-service",
    title: "Attendance",
    icon: "calendar-check",
    summary: "Your check-in / check-out and personal attendance history.",
    useful: "Record your presence and review late, absent, or missing punches for yourself.",
    howTo:
      "Open Attendance. Check in when you start work and check out when you finish. Use history to review past days. Request a correction if a punch is wrong.",
    features: [
      {
        name: "Check in / check out",
        icon: "log-in",
        detail: "Mark when you start and end work for the day.",
        tip: "Follow company policy for location or shift rules if they appear.",
      },
      {
        name: "My attendance history",
        icon: "history",
        detail: "Past days with status (present, late, absent, leave) and working hours.",
        tip: "Review this before payroll if you need to confirm your record.",
      },
      {
        name: "Corrections",
        icon: "wrench",
        detail: "Request a fix when a punch is missing or incorrect (when enabled).",
        tip: "Submit corrections early, before payroll closes.",
      },
    ],
  },
  {
    id: "directory",
    group: "Self-service",
    title: "Employee Directory",
    icon: "users",
    summary:
      "A read-only company directory so you can find colleagues by name, department, or role.",
    useful:
      "Helps you locate people and contact details without asking HR for a list.",
    howTo:
      "Open Employee Directory. Search by name or filter by department. Open a person only to view allowed directory details — this is not employee management.",
    features: [
      {
        name: "Search & filters",
        icon: "search",
        detail: "Find people by name, department, or other directory fields available to you.",
        tip: "Use search first — the full list can be long.",
      },
      {
        name: "Colleague cards",
        icon: "users",
        detail: "Basic identity such as name, designation, and department.",
        tip: "You cannot edit another person’s record from this page.",
      },
    ],
  },
  {
    id: "payroll",
    group: "Self-service",
    title: "Payroll",
    icon: "wallet",
    summary: "Your payslips after HR publishes a payroll run.",
    useful: "Download and review your salary documents without asking HR each month.",
    howTo:
      "Open Payroll. When a month is published, open the payslip and download if needed. Older months stay under history.",
    features: [
      {
        name: "Current payslip",
        icon: "receipt",
        detail: "Latest published payslip with earnings and deductions when available.",
        tip: "Empty usually means HR has not published that month yet.",
      },
      {
        name: "Payroll history",
        icon: "archive",
        detail: "Previous months you can browse and download again.",
        tip: "Use history for past claims or tax references.",
      },
      {
        name: "Payroll policy",
        icon: "book",
        detail: "Read-only notes about payroll rules that apply to employees.",
        tip: "Policy explains rules; it does not change your payslip amounts.",
      },
    ],
  },
  {
    id: "documents",
    group: "Self-service",
    title: "Documents",
    icon: "file-text",
    summary: "Letters and files shared with you personally.",
    useful: "Find appointment letters, policies, and certificates issued to you.",
    howTo:
      "Open Documents. Browse the list, then preview or download. Only files shared with your account appear.",
    features: [
      {
        name: "Document list",
        icon: "files",
        detail: "All documents currently available on your account.",
        tip: "If a letter is missing, ask HR to share it.",
      },
      {
        name: "Preview & download",
        icon: "download",
        detail: "Open a file in the browser or save a copy.",
        tip: "Keep downloads secure — they may contain personal data.",
      },
    ],
  },
  {
    id: "leave",
    group: "Self-service",
    title: "Leave",
    icon: "calendar-days",
    summary: "Your leave balance, calendar, and leave requests.",
    useful: "Apply for time off and track whether it is pending, approved, or rejected.",
    howTo:
      "Open Leave. Check balance, apply with dates and type, then track status. Read policy if you are unsure about a leave type.",
    features: [
      {
        name: "Leave balance",
        icon: "wallet",
        detail: "Remaining days by leave type (casual, sick, earned, and others).",
        tip: "Balance updates after approvals and accruals.",
      },
      {
        name: "Apply leave",
        icon: "plus",
        detail: "Create a request with type, dates, reason, and required notes.",
        tip: "Apply early for planned leave so approvers have time.",
      },
      {
        name: "My leave requests",
        icon: "list",
        detail: "All of your requests with current status.",
        tip: "Pending means waiting for approval — check Notifications for updates.",
      },
      {
        name: "Leave policy",
        icon: "scroll",
        detail: "Company leave rules that apply to you.",
        tip: "Read policy before applying if a type is unclear.",
      },
    ],
  },
  {
    id: "my-goals",
    group: "Self-service",
    title: "My Goals",
    icon: "target",
    summary:
      "Your personal performance workspace: goals, KPIs, feedback, 1:1s, and promotion items.",
    useful: "Track your own goals and reviews in one place.",
    howTo:
      "Open My Goals. Move between Goals, KPIs, Feedback, 1:1s, and Promotions. Update progress on items assigned to you.",
    features: [
      {
        name: "Goals & OKRs",
        icon: "target",
        detail: "Goals assigned to you for the current cycle.",
        tip: "Keep progress updated before review meetings.",
      },
      {
        name: "KPIs",
        icon: "activity",
        detail: "Measurable indicators tied to your role.",
        tip: "KPIs explain how success is measured for your role.",
      },
      {
        name: "Feedback",
        icon: "message",
        detail: "Feedback shared with you from managers or reviews.",
        tip: "Use feedback notes to prepare for 1:1s.",
      },
      {
        name: "1:1 Meetings",
        icon: "users-round",
        detail: "Your 1:1 notes, agendas, and follow-ups.",
        tip: "Capture action items so they are not lost.",
      },
      {
        name: "Promotions",
        icon: "trending",
        detail: "Promotion-related records that involve you.",
        tip: "This is your record — HR and managers own the process.",
      },
    ],
  },
  {
    id: "assets",
    group: "Self-service",
    title: "Assets",
    icon: "laptop",
    summary: "Company equipment assigned to you (laptop, phone, accessories).",
    useful: "Confirms what you hold so you can report damage, loss, or return needs.",
    howTo:
      "Open Assets. Review the assigned list and open an item for type, status, and assignment details.",
    features: [
      {
        name: "Assigned assets",
        icon: "laptop",
        detail: "Every asset currently linked to your employee record.",
        tip: "If you hold an item that is missing from the list, tell HR.",
      },
      {
        name: "Asset details",
        icon: "info",
        detail: "Type, status, identity info, and assignment date when available.",
        tip: "Check details before returning equipment.",
      },
    ],
  },
  {
    id: "notifications",
    group: "Self-service",
    title: "Notifications",
    icon: "bell",
    summary: "Alerts for leave decisions, payslips, documents, and other updates.",
    useful: "Keeps you informed without checking every module manually.",
    howTo:
      "Open Notifications. Read unread items, then use History for older alerts.",
    features: [
      {
        name: "Notification center",
        icon: "bell",
        detail: "Current and recent alerts that need your attention.",
        tip: "Clear unread items so important updates are not missed.",
      },
      {
        name: "Notification history",
        icon: "clock",
        detail: "Older notifications you may have already read.",
        tip: "Use history to find an older leave or payslip alert.",
      },
    ],
  },
  {
    id: "settings",
    group: "Self-service",
    title: "Settings",
    icon: "settings",
    summary: "Portal preferences and account security, including password reset.",
    useful: "Lets you adjust your experience and reset your login when needed.",
    howTo:
      "Open Settings. Change preferences if available. For password reset, open Account & security. You can request up to 3 reset emails per day.",
    features: [
      {
        name: "Preferences",
        icon: "sliders",
        detail: "Display, sound, or notification preferences for your login.",
        tip: "Preferences affect only your account.",
      },
      {
        name: "Account & security",
        icon: "shield",
        detail: "Request a password reset email. Daily limit is 3 requests.",
        tip: "If the limit is reached, wait until tomorrow or contact HR.",
      },
    ],
  },
];
