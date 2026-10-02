export const ATTENDANCE_PAGE_SIZE = 30;

export type AttendancePageSlot = {
  employeeIndex: number;
  dateIndex: number;
};

/**
 * Page of the attendance grid without building every employee-day row.
 * Single day is employee order. A date range is date, then employee.
 */
export function attendanceRecordSlots(input: {
  employeeCount: number;
  dateCount: number;
  page: number;
  pageSize: number;
  order: "date-then-employee" | "employee";
}): AttendancePageSlot[] {
  const employeeCount = Math.max(0, input.employeeCount);
  const dateCount = Math.max(0, input.dateCount);
  const total = employeeCount * dateCount;
  if (total === 0 || input.pageSize < 1 || input.page < 1) return [];

  const start = (input.page - 1) * input.pageSize;
  if (start >= total) return [];
  const end = Math.min(start + input.pageSize, total);
  const slots: AttendancePageSlot[] = [];

  for (let index = start; index < end; index += 1) {
    if (input.order === "date-then-employee") {
      slots.push({
        dateIndex: Math.floor(index / employeeCount),
        employeeIndex: index % employeeCount,
      });
    } else {
      slots.push({
        employeeIndex: Math.floor(index / dateCount),
        dateIndex: index % dateCount,
      });
    }
  }

  return slots;
}

export function attendancePageCount(total: number, pageSize: number): number {
  if (total <= 0 || pageSize < 1) return 1;
  return Math.ceil(total / pageSize);
}

export function attendancePageNumbers(
  page: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const numbers: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) numbers.push("ellipsis");
  for (let current = start; current <= end; current += 1) numbers.push(current);
  if (end < totalPages - 1) numbers.push("ellipsis");
  numbers.push(totalPages);
  return numbers;
}
