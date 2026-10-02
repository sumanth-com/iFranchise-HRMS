import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ATTENDANCE_PAGE_SIZE,
  attendancePageCount,
  attendanceRecordSlots,
} from "@/lib/attendance/attendance-pagination";

describe("attendance pagination", () => {
  it("defaults to 30 records", () => {
    assert.equal(ATTENDANCE_PAGE_SIZE, 30);
  });

  it("pages 36 records as 30 then 6", () => {
    const pageSize = ATTENDANCE_PAGE_SIZE;
    const first = attendanceRecordSlots({
      employeeCount: 12,
      dateCount: 3,
      page: 1,
      pageSize,
      order: "date-then-employee",
    });
    const second = attendanceRecordSlots({
      employeeCount: 12,
      dateCount: 3,
      page: 2,
      pageSize,
      order: "date-then-employee",
    });

    assert.equal(attendancePageCount(36, pageSize), 2);
    assert.equal(first.length, 30);
    assert.equal(second.length, 6);
    assert.deepEqual(first[0], { dateIndex: 0, employeeIndex: 0 });
    assert.deepEqual(first[29], { dateIndex: 2, employeeIndex: 5 });
    assert.deepEqual(second[0], { dateIndex: 2, employeeIndex: 6 });
    assert.deepEqual(second[5], { dateIndex: 2, employeeIndex: 11 });
  });

  it("pages 60 records into two full pages", () => {
    const pageSize = ATTENDANCE_PAGE_SIZE;
    const first = attendanceRecordSlots({
      employeeCount: 12,
      dateCount: 5,
      page: 1,
      pageSize,
      order: "date-then-employee",
    });
    const second = attendanceRecordSlots({
      employeeCount: 12,
      dateCount: 5,
      page: 2,
      pageSize,
      order: "date-then-employee",
    });

    assert.equal(attendancePageCount(60, pageSize), 2);
    assert.equal(first.length, 30);
    assert.equal(second.length, 30);
    assert.deepEqual(second[29], { dateIndex: 4, employeeIndex: 11 });
  });

  it("pages 108 records across four pages", () => {
    const pageSize = ATTENDANCE_PAGE_SIZE;
    const pages = [1, 2, 3, 4].map((page) =>
      attendanceRecordSlots({
        employeeCount: 12,
        dateCount: 9,
        page,
        pageSize,
        order: "date-then-employee",
      }),
    );

    assert.equal(attendancePageCount(108, pageSize), 4);
    assert.deepEqual(
      pages.map((page) => page.length),
      [30, 30, 30, 18],
    );
    assert.deepEqual(pages[3][0], { dateIndex: 7, employeeIndex: 6 });
    assert.deepEqual(pages[3][17], { dateIndex: 8, employeeIndex: 11 });
  });

  it("keeps a single day in employee order", () => {
    const slots = attendanceRecordSlots({
      employeeCount: 12,
      dateCount: 1,
      page: 1,
      pageSize: 30,
      order: "employee",
    });
    assert.equal(slots.length, 12);
    assert.deepEqual(slots[11], { employeeIndex: 11, dateIndex: 0 });
  });
});
