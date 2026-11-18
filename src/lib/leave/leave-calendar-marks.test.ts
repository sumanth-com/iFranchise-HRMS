import assert from "node:assert/strict";
import test from "node:test";
import { buildLeaveCalendarMarks } from "./leave-calendar-marks";
import { leaveCalendarMarkLabel } from "./leave-calendar-display";
import { classifyCalendarDay, DEFAULT_LEAVE_CALENDAR } from "./services/leave-calendar-engine";
import type { LeaveCalendarEntry } from "@/types/leave";

const leave: LeaveCalendarEntry = {
  id: "leave-1", employeeId: "employee-1", employeeName: "Fixture",
  leaveTypeName: "Casual Leave", leaveTypeCode: "CL",
  startDate: "2026-11-10", endDate: "2026-11-10", totalDays: 1,
  isHalfDay: false, leaveStatus: "approved",
};

test("every request status remains visible on the shared calendar without mutating records", () => {
  const leaves = (["approved", "pending", "rejected", "cancelled", "withdrawn"] as const)
    .map((leaveStatus) => ({ ...leave, id: leaveStatus, leaveStatus }));
  const original = structuredClone(leaves);
  const marks = buildLeaveCalendarMarks(leaves, []);
  assert.deepEqual(marks.leavesByDate.get(leave.startDate), leaves);
  assert.deepEqual(leaves, original);
});

test("official holidays, optional holidays and weekly offs retain their classification", () => {
  const holidays = [
    { id: "holiday-1", name: "Festival", holidayDate: "2026-11-10", isOptional: false },
    { id: "holiday-2", name: "Optional festival", holidayDate: "2026-11-11", isOptional: true },
  ];
  const marks = buildLeaveCalendarMarks([], holidays);
  assert.equal(marks.holidayMap.get("2026-11-11")?.name, "Optional festival");
  assert.equal(classifyCalendarDay("2026-11-10", marks.calendarWithHolidays), "holiday");
  assert.equal(classifyCalendarDay("2026-11-11", marks.calendarWithHolidays), "working");
  assert.equal(classifyCalendarDay("2026-11-15", marks.calendarWithHolidays), "weekly_off");
  assert.deepEqual(DEFAULT_LEAVE_CALENDAR.holidays, []);
});

test("recorded paid and LOP allocations retain the original dates and labels", () => {
  const allocated: LeaveCalendarEntry = { ...leave, endDate: "2026-11-12", dayAllocations: [
    { date: "2026-11-10", kind: "paid", counted: 1 },
    { date: "2026-11-11", kind: "lop", counted: 1 },
    { date: "2026-11-12", kind: "none", counted: 0 },
  ] };
  const marks = buildLeaveCalendarMarks([allocated], []);
  assert.deepEqual([...marks.leavesByDate.keys()], ["2026-11-10", "2026-11-11"]);
  assert.equal(leaveCalendarMarkLabel(allocated, "2026-11-11"), "LOP");
});

test("pending HR review still shows counted unallocated days", () => {
  const review: LeaveCalendarEntry = { ...leave, leaveStatus: "pending", hrReviewRequired: true,
    dayAllocations: [{ date: "2026-11-10", kind: "none", counted: 1 }] };
  assert.deepEqual(buildLeaveCalendarMarks([review], []).leavesByDate.get("2026-11-10"), [review]);
  assert.equal(leaveCalendarMarkLabel(review, "2026-11-10"), "HR Review");
});

test("sandwich overlays retain the old calendar's separation from unallocated leave marks", () => {
  const spanning = { ...leave, startDate: "2026-11-14", endDate: "2026-11-16", totalDays: 3 };
  const marks = buildLeaveCalendarMarks([spanning], []);
  assert.equal(marks.sandwichDates.has("2026-11-15"), true);
  assert.equal(marks.leavesByDate.has("2026-11-15"), false);
  assert.deepEqual(marks.leavesByDate.get("2026-11-16"), [spanning]);
});
