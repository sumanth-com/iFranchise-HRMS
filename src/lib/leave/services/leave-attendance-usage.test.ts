import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countAttendanceLeaveDaysByCode,
  leaveTypeCodeFromAttendanceNotes,
  mergeAttendanceAndRequestLeaveUsage,
} from "@/lib/leave/services/leave-attendance-usage";

describe("leave attendance usage", () => {
  it("reads CL/EL/PL from attendance note markers", () => {
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:CL|excel-import-2026-09"), "CL");
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:EL|excel-import-2026-09"), "EL");
    assert.equal(leaveTypeCodeFromAttendanceNotes("src:PL|excel-import-2026-09"), "PL");
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
