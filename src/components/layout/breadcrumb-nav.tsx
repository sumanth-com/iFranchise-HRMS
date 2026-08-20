"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatEmployeeRouteRefLabel } from "@/lib/employees/routing";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  parseTeamPayrollSection,
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
  type TeamPayrollSection,
} from "@/lib/payroll/constants";
import { useBreadcrumbLabelState } from "@/providers/breadcrumb-label-provider";

type BreadcrumbItemConfig = {
  label: string;
  href: string;
};

function isUuid(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    segment,
  );
}

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildBreadcrumbItems(
  pathname: string,
  searchParams: URLSearchParams | null,
): BreadcrumbItemConfig[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [{ label: "Home", href: HR_PORTAL_HOME }];
  }

  if (segments[0] === "dashboard" && segments[1] === "system") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/dashboard/system" },
    ];

    if (!segments[2]) {
      return items;
    }

    const nestedLabels: Record<string, string> = {
      overview: "System Dashboard",
      "hr-overview": "HR Overview",
      employees: "Employees",
      provisioning: "User Provisioning",
      organization: "Organization",
      audit: "Audit Trail",
      security: "Security",
      integrations: "System / Integrations",
      profile: "My Profile",
      attendance: "Attendance",
      payroll: "Payroll",
      documents: "Documents",
      leave: "Leave",
      goals: "My Goals",
      assets: "Assets",
      notifications: "Notifications",
      settings: "Settings",
      database: "Database Health",
      storage: "Storage Manager",
      email: "Email Services",
      "api-keys": "API Keys",
      backup: "Backup & Restore",
      roles: "Roles & Access",
    };

    items.push({
      label: nestedLabels[segments[2]] ?? formatSegment(segments[2]),
      href: `/dashboard/system/${segments[2]}`,
    });

    if (segments[2] === "employees" && segments[3]) {
      const employeeHref = `/dashboard/system/employees/${segments[3]}`;

      if (segments[4] === "edit") {
        items.push({
          label: formatEmployeeRouteRefLabel(segments[3]),
          href: employeeHref,
        });
        items.push({ label: "Edit", href: pathname });
        return items;
      }

      items.push({
        label: formatEmployeeRouteRefLabel(segments[3]),
        href: pathname,
      });
      return items;
    }

    if (segments[3]) {
      // Audit Trail opens logs directly — skip the redundant "logs" crumb.
      if (segments[2] === "audit" && segments[3] === "logs") {
        if (segments[4]) {
          items.push({ label: "Detail", href: pathname });
        }
        return items;
      }

      const deepLabels: Record<string, string> = {
        kpis: "KPIs",
        feedback: "Feedback",
        "one-on-ones": "1:1 Meetings",
        promotions: "Promotions",
        center: "Notification Center",
        history: "History",
        permissions: "Permissions",
        assignments: "Assignments",
        compare: "Compare",
        profile: "Company",
        branches: "Branches",
        departments: "Departments",
        designations: "Designations",
        "employment-types": "Employment Types",
        hierarchy: "Hierarchy",
        timeline: "Timeline",
      };
      items.push({
        label: deepLabels[segments[3]] ?? formatSegment(segments[3]),
        href: pathname,
      });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "hr-overview") {
    return [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "HR Overview", href: "/dashboard/hr-overview" },
    ];
  }

  if (segments[0] === "dashboard" && segments[1] === "employees") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Employees", href: "/dashboard/employees" },
    ];

    if (segments[2] === "new") {
      items.push({ label: "New employee", href: pathname });
      return items;
    }

    if (segments[2]) {
      const employeeHref = `/dashboard/employees/${segments[2]}`;

      if (segments[3] === "edit") {
        items.push({
          label: formatEmployeeRouteRefLabel(segments[2]),
          href: employeeHref,
        });
        items.push({ label: "Edit", href: pathname });
        return items;
      }

      items.push({
        label: formatEmployeeRouteRefLabel(segments[2]),
        href: pathname,
      });
      return items;
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "documents") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Documents", href: "/dashboard/documents" },
    ];

    if (segments[2] === "team") {
      items.push({ label: "HR Documents", href: "/dashboard/documents/team" });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "documents-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Documents", href: "/dashboard/documents" },
      { label: "HR Documents", href: "/dashboard/documents/team" },
    ];

    const sectionLabels: Record<string, string> = {
      employees: "Employee Documents",
      letters: "Company Letters",
      templates: "Templates",
      expiring: "Expiring Documents",
      settings: "Settings",
    };

    if (segments[2]) {
      items.push({
        label: sectionLabels[segments[2]] ?? formatSegment(segments[2]),
        href: `/dashboard/documents-management/${segments[2]}`,
      });
    }

    if (segments[2] === "employees" && segments[3]) {
      items.push({
        label: formatEmployeeRouteRefLabel(segments[3]),
        href: pathname,
      });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "attendance") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Attendance", href: "/dashboard/attendance" },
    ];

    if (segments[2] === "team") {
      items.push({ label: "Team Attendance", href: "/dashboard/attendance/team" });
    }

    if (segments[2] === "policy") {
      items.push({ label: "Attendance Policy", href: pathname });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "attendance-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Attendance", href: "/dashboard/attendance" },
      { label: "Team Attendance", href: "/dashboard/attendance/team" },
    ];

    if (segments[2] === "new") {
      items.push({ label: "Add attendance", href: pathname });
      return items;
    }

    if (segments[2] === "settings") {
      items.push({ label: "Settings", href: pathname });
      return items;
    }

    if (segments[2] === "policy") {
      items.push({ label: "Attendance Policy", href: pathname });
      return items;
    }

    if (segments[2]) {
      const attendanceHref = `/dashboard/attendance-management/${segments[2]}`;

      if (segments[3] === "edit") {
        items.push({ label: "Attendance details", href: attendanceHref });
        items.push({ label: "Edit", href: pathname });
        return items;
      }

      items.push({ label: "Attendance details", href: pathname });
      return items;
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "payroll") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Payroll", href: "/dashboard/payroll" },
    ];

    if (segments[2] === "policy") {
      items.push({ label: "Payroll Policy", href: pathname });
      return items;
    }

    if (segments[2] === "team") {
      const section = parseTeamPayrollSection(segments[3]);

      const sectionLabels: Record<TeamPayrollSection, string> = {
        run: "Run Payroll",
        "salary-structures": "Salary Structure",
        bonuses: "Bonuses",
        reimbursements: "Expense claims",
        payslips: "Payslips",
        settings: "Settings",
      };

      items.push({
        label: "Team Payroll",
        href: payrollHubUrl({ tab: "team", section: TEAM_PAYROLL_SECTIONS.run }),
      });
      if (section !== TEAM_PAYROLL_SECTIONS.run) {
        items.push({
          label: sectionLabels[section],
          href: payrollHubUrl({ tab: "team", section }),
        });
      }
      return items;
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "directory") {
    return [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Employee Directory", href: "/dashboard/directory" },
    ];
  }

  if (segments[0] === "dashboard" && segments[1] === "assets") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Assets", href: "/dashboard/assets" },
    ];

    if (segments[2] === "team") {
      items.push({ label: "Company Assets", href: "/dashboard/assets/team" });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "settings") {
    return [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Settings", href: "/dashboard/settings" },
    ];
  }

  if (segments[0] === "dashboard" && segments[1] === "assets-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Assets", href: "/dashboard/assets" },
      { label: "Company Assets", href: "/dashboard/assets/team" },
    ];

    const sectionLabels: Record<string, string> = {
      inventory: "Assets",
      assignments: "Assignments",
      maintenance: "Maintenance",
      vendors: "Vendors",
      reports: "Reports",
      settings: "Settings",
    };

    if (segments[2]) {
      items.push({
        label: sectionLabels[segments[2]] ?? formatSegment(segments[2]),
        href: `/dashboard/assets-management/${segments[2]}`,
      });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "payroll-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Payroll", href: "/dashboard/payroll" },
      { label: "Team Payroll", href: "/dashboard/payroll/team" },
    ];

    const sectionLabels: Record<string, string> = {
      run: "Run Payroll",
      history: "Payroll History",
      "salary-structures": "Salary Structure",
      revisions: "Salary Revisions",
      bonuses: "Bonuses",
      reimbursements: "Reimbursements",
      payslips: "Payslips",
      settings: "Settings",
    };

    if (!segments[2]) {
      return items;
    }

    if (segments[2] === "salary-structures") {
      items.push({
        label: sectionLabels["salary-structures"],
        href: "/dashboard/payroll-management/salary-structures",
      });
      if (segments[3] === "new") {
        items.push({ label: "New", href: pathname });
      }
      return items;
    }

    if (segments[2] === "payslips") {
      items.push({
        label: sectionLabels.payslips,
        href: "/dashboard/payroll-management/payslips",
      });
      if (segments[3]) {
        items.push({ label: "Payslip details", href: pathname });
      }
      return items;
    }

    if (sectionLabels[segments[2]]) {
      items.push({
        label: sectionLabels[segments[2]],
        href: payrollHubUrl({
          tab: "team",
          section: segments[2] as TeamPayrollSection,
        }),
      });
      return items;
    }

    items.push({ label: "Payroll details", href: pathname });
    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "leave") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Leave", href: "/dashboard/leave" },
    ];

    if (segments[2] === "new") {
      items.push({ label: "Apply leave", href: pathname });
      return items;
    }

    if (segments[2] === "team") {
      items.push({ label: "Team Leave", href: "/dashboard/leave/team" });
      return items;
    }

    if (segments[2] === "policy") {
      items.push({ label: "Leave Policy", href: pathname });
      return items;
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "leave-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Leave", href: "/dashboard/leave" },
      { label: "Team Leave", href: "/dashboard/leave/team" },
    ];

    if (segments[2] === "new") {
      items.push({ label: "New request", href: pathname });
      return items;
    }

    if (segments[2] === "balances") {
      items.push({ label: "Balances", href: pathname });
      return items;
    }

    if (segments[2] === "calendar") {
      items.push({ label: "Calendar", href: pathname });
      return items;
    }

    if (segments[2] === "settings") {
      items.push({ label: "Settings", href: pathname });
      return items;
    }

    if (segments[2] === "policy") {
      items.push({ label: "Leave Policy", href: pathname });
      return items;
    }

    if (segments[2]) {
      items.push({ label: "Leave details", href: pathname });
      return items;
    }

    return items;
  }

  if (segments[0] === "manager") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/manager" },
    ];

    const sectionLabels: Record<string, string> = {
      overview: "Manager Overview",
      profile: "My Profile",
      team: "Teammates",
      attendance: "Attendance",
      leave: "Leave",
      payroll: "Payroll",
      documents: "Documents",
      goals: "My Goals",
      assets: "Assets",
      resignation: "Resignations",
      performance: "Performance",
      recruitment: "Recruitment",
      reports: "Reports",
      notifications: "Notifications",
      settings: "Settings",
    };

    if (segments[1] === "attendance" && segments[2] === "team") {
      items.push({ label: "Team Attendance", href: MANAGER_ROUTES.attendanceTeam });
      return items;
    }

    if (segments[1] === "leave" && segments[2] === "team") {
      items.push({ label: "Team Leave", href: MANAGER_ROUTES.leaveTeam });
      return items;
    }

    if (segments[1]) {
      const sectionLabel = sectionLabels[segments[1]] ?? formatSegment(segments[1]);
      items.push({
        label: sectionLabel,
        href: `/manager/${segments[1]}`,
      });
    }

    if (segments[1] === "leave" && segments[2] === "new") {
      items.push({ label: "Apply leave", href: pathname });
      return items;
    }

    if (segments[1] === "goals" && segments[2]) {
      const goalLabels: Record<string, string> = {
        kpis: "KPIs",
        feedback: "Feedback",
        "one-on-ones": "1:1 Meetings",
        promotions: "Promotions",
      };
      items.push({
        label: goalLabels[segments[2]] ?? formatSegment(segments[2]),
        href: pathname,
      });
      return items;
    }

    if (
      segments[2] &&
      (segments[1] === "performance" ||
        segments[1] === "recruitment" ||
        segments[1] === "reports")
    ) {
      const nestedLabels: Record<string, string> = {
        goals: "Goals & OKRs",
        kpis: "KPIs",
        feedback: "Feedback",
        "one-on-ones": "1:1 Meetings",
        promotions: "Promotions",
        jobs: "Job Openings",
        candidates: "Candidates",
        offers: "Offers",
        interviews: "Interviews",
        attendance: "Attendance",
        leave: "Leave",
        performance: "Performance",
        recruitment: "Recruitment",
        hr: "Team",
      };
      items.push({
        label: nestedLabels[segments[2]] ?? formatSegment(segments[2]),
        href: pathname,
      });
      return items;
    }

    if (segments[1] === "notifications" && segments[2]) {
      items.push({
        label: formatSegment(segments[2]),
        href: pathname,
      });
    }

    if (segments[1] === "team" && segments[2]) {
      items.push({
        label: formatEmployeeRouteRefLabel(segments[2]),
        href: pathname,
      });
    }

    return items;
  }

  if (segments[0] === "ceo") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/ceo" },
    ];

    const sectionLabels: Record<string, string> = {
      organization: "Organization",
      recruitment: "Recruitment",
      performance: "Performance",
      payroll: "Payroll",
      attendance: "Attendance",
      approvals: "Approvals",
      analytics: "Analytics",
      reports: "Reports",
      notifications: "Notifications",
      profile: "My Profile",
      settings: "Settings",
      "user-provisioning": "User Provisioning",
    };

    if (segments[1]) {
      const sectionLabel = sectionLabels[segments[1]] ?? formatSegment(segments[1]);
      items.push({
        label: sectionLabel,
        href: `/ceo/${segments[1]}`,
      });
    }

    if (
      segments[2] &&
      (segments[1] === "organization" ||
        segments[1] === "recruitment" ||
        segments[1] === "performance" ||
        segments[1] === "approvals" ||
        segments[1] === "payroll" ||
        segments[1] === "reports")
    ) {
      const nestedLabels: Record<string, string> = {
        leave: "Leave",
        exit: "Exit",
        run: "Run Payroll",
        "salary-structures": "Salary Structure",
        bonuses: "Bonuses",
        reimbursements: "Expense claims",
        payslips: "Payslips",
        settings: "Settings",
        attendance: "Attendance",
        payroll: "Payroll",
        performance: "Performance",
        recruitment: "Recruitment",
        assets: "Assets",
      };
      items.push({
        label: nestedLabels[segments[2]] ?? formatSegment(segments[2]),
        href: pathname,
      });
    }

    if (segments[1] === "notifications" && segments[2]) {
      items.push({
        label: formatSegment(segments[2]),
        href: pathname,
      });
    }

    return items;
  }

  if (segments[0] === "employee") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Employee", href: "/employee" },
    ];

    const sectionLabels: Record<string, string> = {
      directory: "Employee Directory",
      attendance: "Attendance",
      leave: "Leave",
      payroll: "Payroll",
      documents: "Documents",
      assets: "Assets",
      notifications: "Notifications",
      settings: "Settings",
      help: "Help",
    };

    if (segments[1]) {
      const sectionHref =
        segments[1] === "attendance" && segments[2] === "policy"
          ? "/employee/attendance"
          : pathname;

      items.push({
        label: sectionLabels[segments[1]] ?? formatSegment(segments[1]),
        href: sectionHref,
      });

      if (segments[1] === "attendance" && segments[2] === "policy") {
        items.push({ label: "Attendance Policy", href: pathname });
      }
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "recruitment" && segments[2] === "onboarding") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Recruitment", href: "/dashboard/recruitment" },
      { label: "Onboarding", href: "/dashboard/recruitment/onboarding" },
    ];

    if (segments[3]) {
      items.push({
        label: isUuid(segments[3]) ? "New hire" : formatSegment(segments[3]),
        href: pathname,
      });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "onboarding") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Recruitment", href: "/dashboard/recruitment" },
      { label: "Onboarding", href: "/dashboard/recruitment/onboarding" },
    ];

    if (segments[2]) {
      items.push({
        label: isUuid(segments[2]) ? "New hire" : formatSegment(segments[2]),
        href: pathname,
      });
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "audit") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: HR_PORTAL_HOME },
      { label: "Audit", href: "/dashboard/audit" },
    ];

    if (segments[2] === "logs") {
      items.push({ label: "Logs", href: "/dashboard/audit/logs" });
      if (segments[3]) {
        items.push({ label: "Detail", href: pathname });
      }
      return items;
    }

    if (segments[2]) {
      items.push({
        label: formatSegment(segments[2]),
        href: pathname,
      });
    }

    return items;
  }

  return segments.map((segment, index) => ({
    label: isUuid(segment) ? "Details" : formatSegment(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumbLabel = useBreadcrumbLabelState();
  const items = buildBreadcrumbItems(pathname, searchParams);

  const resolvedItems =
    breadcrumbLabel?.label && items.length > 0
      ? items.map((item, index) =>
          index === items.length - 1 ? { ...item, label: breadcrumbLabel.label! } : item,
        )
      : items;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {resolvedItems.map((item, index) => {
          const isLast = index === resolvedItems.length - 1;

          return (
            <Fragment key={item.href}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0">
                {isLast ? (
                  <BreadcrumbPage className="truncate">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<Link href={item.href} />}
                    className="truncate"
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
