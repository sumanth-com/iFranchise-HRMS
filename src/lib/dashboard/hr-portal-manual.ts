import type { ManualSection } from "@/lib/help/portal-manual";

export const HR_PORTAL_MANUAL: ManualSection[] = [
  {
    id: "dashboard",
    group: "Self-service",
    title: "Dashboard",
    icon: "layout",
    summary:
      "Your personal home view — attendance, leave, and self-service status. Not the company HR overview.",
    useful:
      "Start your own day here, then switch to Administration for org-wide HR work.",
    howTo:
      "Open Dashboard under Self-service. Read personal KPIs. For company-wide numbers, use HR Overview instead.",
    features: [
      {
        name: "Personal KPI tiles",
        icon: "gauge",
        detail: "Your attendance, hours, leave balance, and pending personal leave.",
        tip: "These tiles are about you, not the whole company.",
      },
      {
        name: "Quick focus",
        icon: "zap",
        detail: "Personal next actions such as your own pending leave.",
        tip: "Team work lives under Administration.",
      },
    ],
  },
  {
    id: "my-profile",
    group: "Self-service",
    title: "My Profile",
    icon: "user",
    summary: "Your own employee profile and contact details.",
    useful: "Keep your phone and emergency contact accurate.",
    howTo:
      "Open My Profile. Update allowed personal fields. Use Employees under Administration to edit other people’s records.",
    features: [
      {
        name: "Personal details",
        icon: "user",
        detail: "Your phone (with country code), emergency contact, and personal fields.",
        tip: "This is your profile — not the employee directory editor.",
      },
      {
        name: "Identity & employment",
        icon: "badge",
        detail: "Your employment identity. Company-wide edits happen in Employees.",
        tip: "Do not confuse this page with an employee’s profile in Administration.",
      },
    ],
  },
  {
    id: "attendance",
    group: "Self-service",
    title: "Attendance",
    icon: "calendar-check",
    summary: "Your personal check-in / check-out. Team Attendance is a different module.",
    useful: "Record your own presence separately from org-wide attendance work.",
    howTo:
      "Open Attendance under Self-service for your punches. Use Team Attendance under Administration for the company.",
    features: [
      {
        name: "Check in / check out",
        icon: "log-in",
        detail: "Mark your own start and end of day.",
        tip: "Teammates’ punches are not managed here.",
      },
      {
        name: "My history",
        icon: "history",
        detail: "Your past attendance status and hours.",
        tip: "Use Team Attendance for org-wide exceptions.",
      },
    ],
  },
  {
    id: "payroll",
    group: "Self-service",
    title: "Payroll",
    icon: "wallet",
    summary: "Your personal payslips. Team Payroll is where HR runs company payroll.",
    useful: "Download your own payslip after a run is published.",
    howTo:
      "Open Payroll under Self-service for your documents. Open Team Payroll under Administration to run or publish company payroll.",
    features: [
      {
        name: "My payslip",
        icon: "receipt",
        detail: "Your latest published payslip.",
        tip: "Empty means that month is not published yet.",
      },
      {
        name: "My payroll history",
        icon: "archive",
        detail: "Your previous months.",
        tip: "Company runs, structures, and bonuses live in Team Payroll.",
      },
    ],
  },
  {
    id: "documents",
    group: "Self-service",
    title: "Documents",
    icon: "file-text",
    summary: "Letters and files shared with you personally.",
    useful: "Find documents issued to your own account.",
    howTo:
      "Open Documents under Self-service. Company document operations for employees are handled from employee profiles / HR document tools, not this personal list.",
    features: [
      {
        name: "My document list",
        icon: "files",
        detail: "Files available on your account.",
        tip: "This is not the company-wide document library.",
      },
      {
        name: "Preview & download",
        icon: "download",
        detail: "Open or save your files.",
        tip: "Keep copies secure.",
      },
    ],
  },
  {
    id: "leave",
    group: "Self-service",
    title: "Leave",
    icon: "calendar-days",
    summary: "Your personal leave. Team Leave is for org-wide HR leave work.",
    useful: "Apply for your own time off without mixing it with employee leave admin.",
    howTo:
      "Open Leave under Self-service for your requests. Use Team Leave under Administration to review and act on company leave.",
    features: [
      {
        name: "My balance & apply",
        icon: "plus",
        detail: "Your remaining days and your own leave applications.",
        tip: "Team approvals are not on this page.",
      },
      {
        name: "My requests",
        icon: "list",
        detail: "Status of leave you submitted for yourself.",
        tip: "Pending personal leave is different from Team Leave pending queues.",
      },
    ],
  },
  {
    id: "my-goals",
    group: "Self-service",
    title: "My Goals",
    icon: "target",
    summary: "Your personal goals, KPIs, feedback, 1:1s, and promotions.",
    useful: "Track your own performance. Company performance admin is under Performance.",
    howTo:
      "Open My Goals under Self-service. Use Performance under Administration to manage employees’ goals.",
    features: [
      {
        name: "Goals, KPIs, feedback",
        icon: "target",
        detail: "Your assigned goals and related personal performance items.",
        tip: "Editing other people’s goals happens in Performance.",
      },
      {
        name: "1:1s & promotions",
        icon: "users-round",
        detail: "Your own 1:1 notes and promotion records.",
        tip: "Team promotion workflows live under Performance.",
      },
    ],
  },
  {
    id: "assets",
    group: "Self-service",
    title: "Assets",
    icon: "laptop",
    summary: "Equipment assigned to you. Company Assets is the inventory module.",
    useful: "See what you hold personally.",
    howTo:
      "Open Assets under Self-service for your assignments. Use Company Assets under Administration for inventory, vendors, and assignments across the company.",
    features: [
      {
        name: "My assigned assets",
        icon: "laptop",
        detail: "Items currently assigned to you.",
        tip: "Issuing assets to others is done in Company Assets.",
      },
    ],
  },
  {
    id: "notifications",
    group: "Self-service",
    title: "Notifications",
    icon: "bell",
    summary: "Alerts for your account and HR operations you are involved in.",
    useful: "Catch invites, leave, payroll, and provisioning updates.",
    howTo: "Open Notifications. Read unread items, then History for older alerts.",
    features: [
      {
        name: "Notification center",
        icon: "bell",
        detail: "Current unread and recent alerts.",
        tip: "Clear unread items so approvals are not missed.",
      },
      {
        name: "History",
        icon: "clock",
        detail: "Older notifications.",
        tip: "Use history to find an earlier invite or payroll alert.",
      },
    ],
  },
  {
    id: "settings",
    group: "Self-service",
    title: "Settings",
    icon: "settings",
    summary: "Your portal preferences and password reset. Company Settings is separate.",
    useful: "Secure your login and adjust personal preferences.",
    howTo:
      "Open Settings under Self-service. Password reset is limited to 3 emails per day. Company-wide branding and policies are under Company Settings.",
    features: [
      {
        name: "Preferences",
        icon: "sliders",
        detail: "Your display and notification preferences.",
        tip: "Does not change company policy.",
      },
      {
        name: "Account & security",
        icon: "shield",
        detail: "Request a password reset email (max 3 per day).",
        tip: "If limited, wait until tomorrow or use another recovery path with Super Admin / IT.",
      },
    ],
  },
  {
    id: "hr-overview",
    group: "Administration",
    title: "HR Overview",
    icon: "layout",
    summary:
      "Company HR dashboard — headcount, attendance, leave, hiring, and items needing HR attention.",
    useful:
      "Start org-wide work here before opening Employees, Team Leave, or Recruitment.",
    howTo:
      "Open HR Overview under Administration. Scan KPIs and exceptions, then open the matching admin module for the actual work.",
    features: [
      {
        name: "Org snapshot",
        icon: "gauge",
        detail: "Company-level counts such as headcount, present today, and pending leave.",
        tip: "This is the opposite of Self-service Dashboard.",
      },
      {
        name: "HR focus areas",
        icon: "alert",
        detail: "Exceptions that usually need HR follow-up.",
        tip: "Start with pending items, then open the related module.",
      },
    ],
  },
  {
    id: "employees",
    group: "Administration",
    title: "Employees",
    icon: "users",
    summary:
      "Employee master records — create, edit, view profiles, and send account invites.",
    useful:
      "This is the source of truth for people data. Invites go through Account provisioning on a profile.",
    howTo:
      "Open Employees. Search or filter, create a new employee, or open a profile to edit details and provision login access.",
    features: [
      {
        name: "Directory & search",
        icon: "search",
        detail: "Browse all employees in company scope with filters.",
        tip: "Open a row to work on that person — the list itself is not the editor.",
      },
      {
        name: "Create / edit employee",
        icon: "user",
        detail:
          "Personal, contact (phone with country code), employment, and organization fields.",
        tip: "Keep department, designation, and reporting manager accurate.",
      },
      {
        name: "Account provisioning",
        icon: "user-plus",
        detail: "Send or resend portal invites from the employee profile.",
        tip: "Invite after the employee record exists — login is not created from Recruitment alone.",
      },
    ],
  },
  {
    id: "recruitment",
    group: "Administration",
    title: "Recruitment",
    icon: "briefcase",
    summary:
      "Hiring pipeline — jobs, candidates, interviews, offers, and onboarding into employment.",
    useful:
      "Run hiring from opening a job through offer and joining, then hand off to Employees.",
    howTo:
      "Open Recruitment. Use Dashboard, Job Openings, Candidates, Offers, and Onboarding. Move candidates through stages and keep evaluations complete.",
    features: [
      {
        name: "Recruitment dashboard",
        icon: "gauge",
        detail: "Pipeline snapshot — open jobs, candidates by stage, offers in flight.",
        tip: "Use this as the hiring health check.",
      },
      {
        name: "Job openings",
        icon: "briefcase",
        detail: "Create and manage roles (draft, open, paused, closed) and hiring details.",
        tip: "Keep job status current so the pipeline stays accurate.",
      },
      {
        name: "Candidates",
        icon: "user-search",
        detail:
          "People in the pipeline (applied through joined/rejected) with stage history.",
        tip: "Advance stages only when evaluations are ready.",
      },
      {
        name: "Interviews",
        icon: "mic",
        detail: "Interview schedules, meeting type, and interviewer recommendations.",
        tip: "Capture scores promptly so HR/CEO stages are not blocked.",
      },
      {
        name: "Offers",
        icon: "handshake",
        detail: "Offer queue — pending send, sent, accepted — after required clearances.",
        tip: "Do not send an offer before the required approval stage is complete.",
      },
      {
        name: "Onboarding",
        icon: "clipboard",
        detail: "New-hire onboarding after offer acceptance, before or as they join.",
        tip: "Completed onboarding still needs an employee record and invite in Employees.",
      },
    ],
  },
  {
    id: "team-attendance",
    group: "Administration",
    title: "Team Attendance",
    icon: "calendar-check",
    summary: "Org-wide attendance — who is present, late, absent, or on leave.",
    useful: "Monitor company presence and follow up on exceptions.",
    howTo:
      "Open Team Attendance. Review today’s board, filter by status or person, and export when needed. Personal punches stay under Self-service Attendance.",
    features: [
      {
        name: "Today’s board",
        icon: "calendar",
        detail: "Present / late / absent / leave across the organization.",
        tip: "Scan exceptions first.",
      },
      {
        name: "Member history",
        icon: "history",
        detail: "One employee’s attendance over a date range.",
        tip: "Use before payroll or disciplinary follow-up.",
      },
      {
        name: "Filters & export",
        icon: "filter",
        detail: "Narrow by status, employee, or dates and export when available.",
        tip: "Exports help monthly attendance reviews.",
      },
    ],
  },
  {
    id: "team-leave",
    group: "Administration",
    title: "Team Leave",
    icon: "calendar-days",
    summary: "Org-wide leave requests, balances, and approvals.",
    useful: "This is HR leave operations. My Leave is only your personal leave.",
    howTo:
      "Open Team Leave. Filter to pending to approve or reject. Open a request for dates, type, reason, and policy fit.",
    features: [
      {
        name: "Company leave list",
        icon: "list",
        detail: "Leave requests across employees.",
        tip: "Filter by pending when you are clearing the queue.",
      },
      {
        name: "Approvals",
        icon: "check",
        detail: "Act on requests waiting for HR or the configured approver path.",
        tip: "Check overlapping team leave before approving large absences.",
      },
      {
        name: "Request detail",
        icon: "file-text",
        detail: "Type, dates, reason, status, and related notes.",
        tip: "Balance impact is visible after approval according to policy.",
      },
    ],
  },
  {
    id: "team-payroll",
    group: "Administration",
    title: "Team Payroll",
    icon: "wallet",
    summary:
      "Company payroll operations — run, salary structures, bonuses, expense claims, payslips, and payroll settings.",
    useful:
      "This is where HR processes salary for the company. Self-service Payroll is only your payslip.",
    howTo:
      "Open Team Payroll. Move through Run, Salary Structure, Bonuses, Expense claims, Payslips, and Settings. Publish only when the run is complete and reviewed.",
    features: [
      {
        name: "Payroll run",
        icon: "banknote",
        detail: "Create and process a payroll cycle for the selected period.",
        tip: "Review exceptions before publishing.",
      },
      {
        name: "Salary structures",
        icon: "list",
        detail: "Compensation structures used when calculating pay.",
        tip: "Keep structures aligned with designations and employment types.",
      },
      {
        name: "Bonuses",
        icon: "gift",
        detail: "Bonus entries included in a cycle when applicable.",
        tip: "Confirm eligibility before adding amounts.",
      },
      {
        name: "Expense claims",
        icon: "receipt",
        detail: "Reimbursements that may flow into payroll.",
        tip: "Approve claims before they are expected in a run.",
      },
      {
        name: "Payslips",
        icon: "files",
        detail: "Generated payslips after a run is published.",
        tip: "Employees see payslips in their Self-service Payroll only after publish.",
      },
      {
        name: "Payroll settings",
        icon: "sliders",
        detail: "Payroll configuration and policy notes for company processing.",
        tip: "Change settings carefully — they affect future runs.",
      },
    ],
  },
  {
    id: "company-assets",
    group: "Administration",
    title: "Company Assets",
    icon: "laptop",
    summary:
      "Asset inventory — register, assignments, maintenance, vendors, reports, and asset settings.",
    useful: "Track company equipment from purchase through assignment and maintenance.",
    howTo:
      "Open Company Assets. Use Dashboard, Assets, Assignments, Maintenance, Vendors, Reports, and Settings. Assign items to employees from Assignments.",
    features: [
      {
        name: "Assets dashboard",
        icon: "gauge",
        detail: "Counts of available, assigned, and maintenance items.",
        tip: "Start here for inventory health.",
      },
      {
        name: "Inventory",
        icon: "package",
        detail: "Register and update individual assets (type, status, identity).",
        tip: "Status should match reality: available, assigned, or in maintenance.",
      },
      {
        name: "Assignments",
        icon: "handshake",
        detail: "Issue or return assets to employees.",
        tip: "Employees see assigned items under Self-service Assets.",
      },
      {
        name: "Maintenance",
        icon: "wrench",
        detail: "Repair or service records for assets.",
        tip: "Keep items in maintenance status while they are not usable.",
      },
      {
        name: "Vendors",
        icon: "building",
        detail: "Suppliers used for purchase or service, including contact phone.",
        tip: "Use country-coded phone numbers for vendor contacts.",
      },
      {
        name: "Asset reports & settings",
        icon: "bar-chart",
        detail: "Inventory reports and module configuration.",
        tip: "Reports help audits; settings control how the module behaves.",
      },
    ],
  },
  {
    id: "performance",
    group: "Administration",
    title: "Performance",
    icon: "target",
    summary:
      "Company performance — Goals & OKRs, KPIs, Feedback, 1:1 Meetings, and Promotions.",
    useful: "HR and leadership use this to run performance cycles for employees.",
    howTo:
      "Open Performance. Switch Goals, KPIs, Feedback, 1:1s, and Promotions. Your personal goals remain under My Goals.",
    features: [
      {
        name: "Goals & OKRs",
        icon: "target",
        detail: "Employee and team goals for the cycle.",
        tip: "Keep owners and dates current.",
      },
      {
        name: "KPIs",
        icon: "activity",
        detail: "Measurable indicators by role or person.",
        tip: "Use KPIs so reviews stay objective.",
      },
      {
        name: "Feedback",
        icon: "message",
        detail: "Captured feedback for employees.",
        tip: "Record feedback close to the event.",
      },
      {
        name: "1:1 Meetings",
        icon: "users-round",
        detail: "Structured check-ins between managers and reports.",
        tip: "Carry open actions into the next meeting.",
      },
      {
        name: "Promotions",
        icon: "trending",
        detail: "Promotion cases and related records.",
        tip: "Coordinate with payroll and employees after a decision.",
      },
    ],
  },
  {
    id: "reports",
    group: "Administration",
    title: "Reports",
    icon: "bar-chart",
    summary:
      "HR reports — Attendance, Leave, Payroll, Performance, Recruitment, Assets, and Exit.",
    useful: "Exportable summaries for audits, leadership, and monthly HR reviews.",
    howTo:
      "Open Reports. Pick a topic, set the date range, review, then export if needed.",
    features: [
      {
        name: "Attendance & leave reports",
        icon: "calendar",
        detail: "Presence exceptions and leave usage over a period.",
        tip: "Use before payroll close and capacity planning.",
      },
      {
        name: "Payroll reports",
        icon: "banknote",
        detail: "Payroll summaries after runs.",
        tip: "Pair with Team Payroll for operational fixes.",
      },
      {
        name: "Performance & recruitment",
        icon: "line-chart",
        detail: "Performance and hiring funnel summaries.",
        tip: "Good for monthly HR leadership packs.",
      },
      {
        name: "Assets & exit",
        icon: "package",
        detail: "Asset and exit-related reporting when available.",
        tip: "Exit reports help clearance and offboarding follow-up.",
      },
    ],
  },
  {
    id: "organization",
    group: "Administration",
    title: "Organization",
    icon: "building",
    summary:
      "Company master data — profile, branches, departments, designations, holidays, and hierarchy.",
    useful: "Clean structure here keeps employees, payroll, and attendance accurate.",
    howTo:
      "Open Organization. Work through Company Profile, Branches, Departments, Designations, Holidays, and Hierarchy. Update structure before assigning employees.",
    features: [
      {
        name: "Company profile",
        icon: "building",
        detail: "Legal/company identity, branding, and organization-level contacts.",
        tip: "Phone fields use country code. This is not Company Settings for all policies.",
      },
      {
        name: "Branches",
        icon: "map-pin",
        detail: "Office / branch locations and related work locations.",
        tip: "Employees should map to the correct branch.",
      },
      {
        name: "Departments",
        icon: "users",
        detail: "Department master list used on employee records.",
        tip: "Rename carefully — many records depend on this list.",
      },
      {
        name: "Designations",
        icon: "badge",
        detail: "Job titles used in profiles and sometimes payroll structures.",
        tip: "Keep titles consistent with hiring and offers.",
      },
      {
        name: "Holidays",
        icon: "calendar",
        detail: "Company holiday calendar that affects leave and attendance.",
        tip: "Publish holidays before the year starts when possible.",
      },
      {
        name: "Hierarchy",
        icon: "git-branch",
        detail: "Reporting structure used by managers and approvals.",
        tip: "Wrong hierarchy hides people from a manager’s team views.",
      },
    ],
  },
  {
    id: "user-provisioning",
    group: "Administration",
    title: "User Provisioning",
    icon: "user-plus",
    summary: "Invite users, assign portals/roles, and manage login access.",
    useful:
      "Separates login access from employee master data. You still create the person in Employees first for staff.",
    howTo:
      "Open User Provisioning. Invite with the correct portal and role. Resend or revoke when access must change.",
    features: [
      {
        name: "Invite user",
        icon: "user-plus",
        detail: "Send a login invite with portal and role.",
        tip: "Confirm email spelling before sending.",
      },
      {
        name: "Access status",
        icon: "key",
        detail: "See who has accepted, pending, or needs a resend.",
        tip: "Pending usually means the invite email was not completed.",
      },
    ],
  },
  {
    id: "roles-access",
    group: "Administration",
    title: "Roles & Access",
    icon: "shield",
    summary: "Roles, permissions, assignments, and role comparison.",
    useful: "Controls what each portal user can see and do. Handle with care.",
    howTo:
      "Open Roles & Access. Use Roles, Permissions, Assignments, and Compare. Change production access only when you intend the side effect.",
    features: [
      {
        name: "Roles",
        icon: "badge",
        detail: "Named roles such as HR, Manager, Employee, and custom roles.",
        tip: "Prefer assigning existing roles over creating many one-off roles.",
      },
      {
        name: "Permissions",
        icon: "shield",
        detail: "Grant or revoke capabilities on a role.",
        tip: "Too many permissions is a security risk; too few blocks work.",
      },
      {
        name: "Assignments",
        icon: "users",
        detail: "Which users hold which roles.",
        tip: "A person can hold more than one portal role when policy allows.",
      },
      {
        name: "Compare",
        icon: "compare",
        detail: "Side-by-side comparison of two roles’ permissions.",
        tip: "Use before cloning or widening a role.",
      },
    ],
  },
  {
    id: "company-settings",
    group: "Administration",
    title: "Company Settings",
    icon: "settings",
    summary:
      "Company-wide configuration — branding, company profile, and policies Super Admin / HR admins can change.",
    useful: "This is not your personal Settings page. It changes the company.",
    howTo:
      "Open Company Settings. Update only fields you are allowed to change. Personal password reset stays under Self-service Settings.",
    features: [
      {
        name: "Company profile & branding",
        icon: "building",
        detail: "Company identity and visual branding used in the product and documents.",
        tip: "Wrong branding affects payslips and emails.",
      },
      {
        name: "Policies & configuration",
        icon: "sliders",
        detail: "Company-level switches and policy-related settings available here.",
        tip: "Test understanding with HR leadership before changing live policy.",
      },
    ],
  },
];
