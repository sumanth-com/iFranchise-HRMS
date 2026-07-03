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
    return [{ label: "Dashboard", href: "/" }];
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
