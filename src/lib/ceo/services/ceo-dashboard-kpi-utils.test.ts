import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveCeoAttendanceKpis,
  roundAttendancePercent,
} from "@/lib/ceo/services/ceo-dashboard-kpi-utils";

describe("CEO dashboard attendance KPIs", () => {
  it("shows 100% when every active employee is present", () => {
    const kpis = deriveCeoAttendanceKpis({
      presentToday: 17,
      absentToday: 0,
      lateToday: 0,
      halfDayToday: 0,
      onLeaveToday: 0,
      totalEmployees: 17,
    });
    assert.equal(kpis.totalEmployees, 17);
    assert.equal(kpis.presentCount, 17);
    assert.equal(kpis.absentToday, 0);
    assert.equal(kpis.onLeaveToday, 0);
    assert.equal(kpis.attendancePercent, 100);
  });

  it("uses Present / active headcount with two-decimal precision (14/17)", () => {
    const kpis = deriveCeoAttendanceKpis({
      presentToday: 14,
      absentToday: 3,
      lateToday: 0,
      halfDayToday: 0,
      onLeaveToday: 0,
      totalEmployees: 17,
    });
    assert.equal(kpis.presentCount, 14);
    assert.equal(kpis.absentToday, 3);
    assert.equal(kpis.attendancePercent, 82.35);
    assert.equal(roundAttendancePercent(14, 17), 82.35);
  });

  it("uses Present / active headcount with two-decimal precision (16/17)", () => {
    assert.equal(roundAttendancePercent(16, 17), 94.12);
    const kpis = deriveCeoAttendanceKpis({
      presentToday: 16,
      absentToday: 1,
      lateToday: 0,
      halfDayToday: 0,
      onLeaveToday: 0,
      totalEmployees: 17,
    });
    assert.equal(kpis.attendancePercent, 94.12);
  });

  it("counts late as Present for % and Today's Workforce Present", () => {
    // Sheet-aligned org summary: presentToday already includes half_day + late; lateToday is 0.
    const kpis = deriveCeoAttendanceKpis({
      presentToday: 14,
      absentToday: 3,
      lateToday: 0,
      halfDayToday: 0,
      onLeaveToday: 0,
      totalEmployees: 17,
    });
    assert.equal(kpis.presentCount, 14);
    assert.equal(kpis.lateToday, 0);
    assert.equal(kpis.attendancePercent, 82.35);
  });

  it("peels on-leave out of folded absentToday so workforce does not double-count", () => {
    // Org getAttendanceSummary: absentToday = absent + on_leave
    const kpis = deriveCeoAttendanceKpis({
      presentToday: 14,
      absentToday: 3,
      lateToday: 0,
      halfDayToday: 0,
      onLeaveToday: 2,
      totalEmployees: 17,
    });
    assert.equal(kpis.absentToday, 1);
    assert.equal(kpis.onLeaveToday, 2);
    assert.equal(kpis.presentCount + kpis.absentToday + kpis.onLeaveToday, 17);
  });

  it("returns 0% when there are no active employees", () => {
    const kpis = deriveCeoAttendanceKpis({
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      halfDayToday: 0,
      onLeaveToday: 0,
      totalEmployees: 0,
    });
    assert.equal(kpis.attendancePercent, 0);
    assert.equal(kpis.totalEmployees, 0);
  });
});
