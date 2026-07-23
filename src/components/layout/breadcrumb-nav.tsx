"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

type BreadcrumbItemConfig = {
  label: string;
  href: string;
};

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildBreadcrumbItems(pathname: string): BreadcrumbItemConfig[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [{ label: "Home", href: "/" }];
  }

  if (segments[0] === "dashboard" && segments[1] === "hr-overview") {
    return [
      { label: "Dashboard", href: "/" },
      { label: "HR Overview", href: "/dashboard/hr-overview" },
    ];
  }

  if (segments[0] === "dashboard" && segments[1] === "employees") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/" },
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
      { label: "Dashboard", href: "/" },
      { label: "Documents", href: "/dashboard/documents" },
    ];
    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "documents-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/" },
      { label: "Documents", href: "/dashboard/documents" },
      { label: "HR Documents", href: "/dashboard/documents?tab=team" },
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
      { label: "Dashboard", href: "/" },
      { label: "Attendance", href: "/dashboard/attendance" },
    ];
    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "attendance-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/" },
      { label: "Attendance", href: "/dashboard/attendance" },
      { label: "Team Attendance", href: "/dashboard/attendance?tab=team" },
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
      { label: "Dashboard", href: "/" },
      { label: "Payroll", href: "/dashboard/payroll" },
    ];
    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "directory") {
    return [
      { label: "Dashboard", href: "/" },
      { label: "Employee Directory", href: "/dashboard/directory" },
    ];
  }

  if (segments[0] === "dashboard" && segments[1] === "assets") {
    return [
      { label: "Dashboard", href: "/" },
      { label: "Assets", href: "/dashboard/assets" },
    ];
  }

  if (segments[0] === "dashboard" && segments[1] === "settings") {
    return [
      { label: "Dashboard", href: "/" },
      { label: "Settings", href: "/dashboard/settings" },
    ];
  }

  if (segments[0] === "dashboard" && segments[1] === "assets-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/" },
      { label: "Assets", href: "/dashboard/assets" },
      { label: "Company Assets", href: "/dashboard/assets?tab=team" },
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
      { label: "Dashboard", href: "/" },
      { label: "Payroll", href: "/dashboard/payroll" },
      { label: "Team Payroll", href: "/dashboard/payroll?tab=team" },
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
        href: `/dashboard/payroll-management/${segments[2]}`,
      });
      return items;
    }

    items.push({ label: "Payroll details", href: pathname });
    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "leave") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/" },
      { label: "Leave", href: "/dashboard/leave" },
    ];

    if (segments[2] === "new") {
      items.push({ label: "Apply leave", href: pathname });
      return items;
    }

    return items;
  }

  if (segments[0] === "dashboard" && segments[1] === "leave-management") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/" },
      { label: "Leave", href: "/dashboard/leave" },
      { label: "Team Leave", href: "/dashboard/leave?tab=team" },
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
      profile: "Attendance",
      team: "My Team",
      attendance: "Attendance",
      leave: "Leave",
      performance: "Performance",
      recruitment: "Recruitment",
      reports: "Reports",
      notifications: "Notifications",
      settings: "Settings",
    };

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
      profile: "Profile & Settings",
    };

    if (segments[1]) {
      const sectionLabel = sectionLabels[segments[1]] ?? formatSegment(segments[1]);
      items.push({
        label: sectionLabel,
        href: `/ceo/${segments[1]}`,
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

  if (segments[0] === "dashboard" && segments[1] === "audit") {
    const items: BreadcrumbItemConfig[] = [
      { label: "Dashboard", href: "/" },
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
    label: formatSegment(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const items = buildBreadcrumbItems(pathname);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

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
