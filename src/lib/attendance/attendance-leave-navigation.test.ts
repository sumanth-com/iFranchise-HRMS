import assert from "node:assert/strict";
import test from "node:test";
import { buildSelfServiceNavItems } from "@/config/self-service-navigation";
import { SYSTEM_ADMIN_NAV_ITEMS } from "@/config/system-admin-navigation";
import { getSidebarNavigation } from "@/lib/auth/navigation";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { canOpenSelfAttendance, canOpenSelfLeave, attendanceWorkspaceQuery, leaveWorkspaceUrl } from "./attendance-leave-navigation";

test("combined navigation retains access for attendance-only and leave-only employees", () => {
  const items = buildSelfServiceNavItems(EMPLOYEE_ROUTES);
  for (const permissions of [["attendance.view"], ["leave.view"], ["attendance.view", "leave.view"]]) {
    const links = getSidebarNavigation(items, permissions, []);
    const combined = links.filter((item) => item.title === "Attendance & Leave");
    assert.equal(combined.length, 1);
    assert.equal(combined[0].href, permissions.includes("attendance.view") ? EMPLOYEE_ROUTES.attendance : EMPLOYEE_ROUTES.leave);
    assert.ok(!links.some((item) => item.title === "Leave"));
  }
  assert.ok(!getSidebarNavigation(items, [], []).some((item) => item.title === "Attendance & Leave"));
});

test("system navigation still requires the existing role", () => {
  assert.ok(!getSidebarNavigation(SYSTEM_ADMIN_NAV_ITEMS, ["attendance.view", "leave.view"], []).some((item) => item.title === "Attendance & Leave"));
  assert.equal(SYSTEM_ADMIN_NAV_ITEMS.filter((item) => item.title === "Attendance & Leave").length, 1);
  assert.ok(!SYSTEM_ADMIN_NAV_ITEMS.some((item) => item.title === "Leave"));
});

test("feature composition mirrors each existing portal guard without granting access", () => {
  for (const portal of ["employee", "accountant", "manager", "hr"] as const) {
    assert.equal(canOpenSelfLeave([], portal), false);
    assert.equal(canOpenSelfAttendance([], portal), false);
    assert.equal(canOpenSelfLeave(["leave.view"], portal), true);
    assert.equal(canOpenSelfAttendance(["leave.view"], portal), false);
    assert.equal(canOpenSelfLeave(["attendance.view"], portal), false);
    assert.equal(canOpenSelfAttendance(["attendance.view"], portal), portal !== "manager");
    assert.equal(canOpenSelfAttendance([`portal.${portal}.access`], portal), portal !== "hr");
    assert.equal(canOpenSelfLeave([`portal.${portal}.access`], portal), portal !== "hr");
  }
});

test("legacy leave links preserve their selected period and open leave history under the shared calendar", () => {
  const url = new URL(leaveWorkspaceUrl("/employee/attendance", { month: "12", year: "2027", calendar: "leave", tag: ["one", "two"] }), "https://fixture.invalid");
  assert.equal(url.pathname, "/employee/attendance");
  assert.equal(url.searchParams.get("month"), "12");
  assert.equal(url.searchParams.get("year"), "2027");
  assert.equal(url.searchParams.get("history"), "leave");
  assert.equal(url.searchParams.get("calendar"), null);
  assert.deepEqual(url.searchParams.getAll("tag"), ["one", "two"]);
});

test("history switches preserve filters and drop the obsolete calendar switch", () => {
  const original = "month=11&year=2026&status=late&page=2&date=2026-11-18";
  const tab = new URLSearchParams(attendanceWorkspaceQuery(original, { history: "leave", calendar: "leave" }));
  assert.equal(tab.get("status"), "late");
  assert.equal(tab.get("page"), "2");
  const next = new URLSearchParams(attendanceWorkspaceQuery(tab.toString(), { month: 1, year: 2027, page: undefined, date: null, status: "" }));
  assert.equal(next.get("history"), "leave");
  assert.equal(next.get("calendar"), null);
  assert.equal(next.get("month"), "1");
  assert.equal(next.get("year"), "2027");
  for (const key of ["page", "date", "status"]) assert.equal(next.has(key), false);
});
