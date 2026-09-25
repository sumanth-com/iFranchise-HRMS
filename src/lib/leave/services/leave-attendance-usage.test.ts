import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countAttendanceLeaveDaysByCode,
  leaveTypeCodeFromAttendanceNotes,
  listAttendanceLeaveDays,
  listAttendanceLopDays,
  mergeAttendanceAndRequestLeaveUsage,
} from "@/lib/leave/services/leave-attendance-usage";

describe("leave attendance usage", () => {
  it("reads CL/EL/PL/OH from attendance note markers", () => {
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:CL|excel-import-2026-09"), "CL");
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:EL|excel-import-2026-09"), "EL");
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:PL|excel-import-2026-09"), "PL");
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:OH|excel-import-2026-09"), "OH");
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:P|excel-import-2026-09"), null);
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:H|excel-import-2026-09"), null);
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:LOP|excel-import-2026-09"), null);
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:leave:abc-uuid"), null);
  });

  it("counts only genuine CL/EL/PL attendance days", () => {
    assert.deepEqual(
      countAttendanceLeaveDaysByCode([
        { notes: "src:CL|excel-import" },
        { notes: "src:CL|excel-import" },
        { notes: "src:EL|excel-import" },
        { notes: "src:P|excel-import" },
        { notes: "src:LOP|excel-import" },
        { notes: "src:leave:req-1" },
      ]),
      { CL: 2, EL: 1, PL: 0 },
    );
  });

  it("lists distinct CL/EL/OH attendance dates for month hover cards", () => {
    assert.deepEqual(
      listAttendanceLeaveDays([
        { attendance_date: "2026-09-05", notes: "src:CL|excel-import-2026-09" },
        { attendance_date: "2026-09-21", notes: "src:CL|excel-import-2026-09" },
        { attendance_date: "2026-09-23", notes: "src:EL|sheet-sync" },
        { attendance_date: "2026-09-15", notes: "src:OH|excel-import" },
        { attendance_date: "2026-09-06", notes: "src:H|excel-import" },
        { attendance_date: "2026-09-08", notes: "src:LOP|excel-import" },
      ]),
      [
        { date: "2026-09-05", code: "CL" },
        { date: "2026-09-15", code: "OH" },
        { date: "2026-09-21", code: "CL" },
        { date: "2026-09-23", code: "EL" },
      ],
    );
  });

  it("lists LOP attendance dates separately from CL/EL", () => {
    assert.deepEqual(
      listAttendanceLopDays([
        { attendance_date: "2026-09-08", notes: "src:LOP|excel-import" },
        { attendance_date: "2026-09-05", notes: "src:CL|excel-import" },
        { attendance_date: "2026-09-09", notes: "src:LOP|excel-import" },
      ]),
      ["2026-09-08", "2026-09-09"],
    );
  });

  it("merges attendance and request usage without double-counting", () => {
    assert.equal(
      mergeAttendanceAndRequestLeaveUsage({ attendanceDays: 7, requestPaidDays: 2 }),
      7,
    );
    assert.equal(
      mergeAttendanceAndRequestLeaveUsage({ attendanceDays: 2, requestPaidDays: 5 }),
      5,
    );
    assert.equal(
      mergeAttendanceAndRequestLeaveUsage({ attendanceDays: 3, requestPaidDays: 3 }),
      3,
    );
  });
});
