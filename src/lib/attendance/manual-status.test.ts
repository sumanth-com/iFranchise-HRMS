import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MANUAL_ATTENDANCE_STATUS_ITEMS,
  mapManualUiStatusToStored,
  mapStoredAttendanceToManualUi,
  resolveAttendanceUiDisplay,
} from "@/lib/attendance/manual-status";

describe("attendance status display", () => {
  it("exposes Present, Absent, Casual Leave, Earned Leave, LOP, Holiday", () => {
    assert.deepEqual(
      MANUAL_ATTENDANCE_STATUS_ITEMS.map((item) => item.label),
      ["Present", "Absent", "Casual Leave", "Earned Leave", "LOP", "Holiday"],
    );
  });

  it("never displays On Leave — CL/EL stay distinct", () => {
    assert.equal(
      resolveAttendanceUiDisplay("on_leave", "src:CL|excel-import").label,
      "Casual Leave",
    );
    assert.equal(
      resolveAttendanceUiDisplay("on_leave", "src:EL|excel-import").label,
      "Earned Leave",
    );
    assert.equal(resolveAttendanceUiDisplay("on_leave", null).label, "Casual Leave");
  });

  it("never collapses LOP into Absent", () => {
    assert.equal(
      resolveAttendanceUiDisplay("absent", "src:LOP|manual-hr-status").label,
      "LOP",
    );
    assert.equal(resolveAttendanceUiDisplay("absent", "src:A").label, "Absent");
  });

  it("maps sheet codes to display labels", () => {
    assert.equal(resolveAttendanceUiDisplay("present", "src:P").label, "Present");
    assert.equal(resolveAttendanceUiDisplay("holiday", "src:H").label, "Holiday");
    assert.equal(resolveAttendanceUiDisplay("week_off", null).label, "Holiday");
    assert.equal(resolveAttendanceUiDisplay("late", null).label, "Present");
  });

  it("maps UI selector values onto existing stored status + src markers", () => {
    assert.deepEqual(mapManualUiStatusToStored("casual_leave"), {
      attendanceStatus: "on_leave",
      sourceCode: "CL",
    });
    assert.deepEqual(mapManualUiStatusToStored("earned_leave"), {
      attendanceStatus: "on_leave",
      sourceCode: "EL",
    });
    assert.deepEqual(mapManualUiStatusToStored("lop"), {
      attendanceStatus: "absent",
      sourceCode: "LOP",
    });
    assert.deepEqual(mapManualUiStatusToStored("holiday"), {
      attendanceStatus: "holiday",
      sourceCode: "H",
    });
  });

  it("maps stored rows back to the HR Status selector", () => {
    assert.equal(mapStoredAttendanceToManualUi("on_leave", "src:CL"), "casual_leave");
    assert.equal(mapStoredAttendanceToManualUi("on_leave", "src:EL"), "earned_leave");
    assert.equal(mapStoredAttendanceToManualUi("absent", "src:LOP"), "lop");
    assert.equal(mapStoredAttendanceToManualUi("holiday", "src:H"), "holiday");
  });
});
