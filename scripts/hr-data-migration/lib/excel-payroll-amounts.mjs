/** Excel payroll field mapping — monthly salary vs attendance earnings vs reimbursement. */

export function money(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/**
 * Monthly Salary = full employee salary (unchanged by attendance).
 * Attendance Earnings = working-day / payable salary from Excel.
 * Net Salary = attendance earnings − salary deductions (e.g. PT).
 * Reimbursement = separate non-salary amount.
 * Final payable = net salary + reimbursement.
 */
export function computeExcelPayrollAmounts(rec) {
  const finalPayout = money(rec.finalPayout);
  const salary = money(rec.salary);
  const workingDaySalary = money(rec.workingDaySalary);
  const professionalTax = money(rec.professionalTax) ?? 0;
  const reimbursement = money(rec.reimbursement) ?? 0;
  const amountAfterPt = money(rec.amountAfterPt);

  if (finalPayout == null && salary == null && workingDaySalary == null) {
    return null;
  }

  const monthlySalary = salary ?? workingDaySalary ?? 0;
  const attendanceEarnings = workingDaySalary ?? salary ?? 0;

  let netSalary = amountAfterPt;
  if (netSalary == null && attendanceEarnings > 0) {
    netSalary = Math.round((attendanceEarnings - professionalTax) * 100) / 100;
  }
  if (netSalary == null) {
    netSalary =
      finalPayout != null && reimbursement > 0
        ? Math.round((finalPayout - reimbursement) * 100) / 100
        : (finalPayout ?? 0);
  }

  let resolvedReimbursement = reimbursement;
  if (resolvedReimbursement === 0 && finalPayout != null && netSalary != null) {
    const diff = Math.round((finalPayout - netSalary) * 100) / 100;
    if (diff > 0) resolvedReimbursement = diff;
  }

  const finalPayable =
    finalPayout ?? Math.round((netSalary + resolvedReimbursement) * 100) / 100;
  const deductions = Math.max(
    0,
    Math.round((attendanceEarnings - netSalary) * 100) / 100,
  );

  return {
    monthlySalary,
    attendanceEarnings,
    netSalary,
    deductions,
    professionalTax,
    reimbursement: resolvedReimbursement,
    finalPayable,
    workingDaySalary,
    salary,
    amountAfterPt,
  };
}

export function buildExcelPayrollBreakdown(rec, amounts, batchId) {
  const {
    monthlySalary,
    attendanceEarnings,
    netSalary,
    deductions,
    professionalTax,
    reimbursement,
    finalPayable,
    workingDaySalary,
    salary,
    amountAfterPt,
  } = amounts;

  const breakdown = {
    source: "excel_historical_option_1",
    importBatchId: batchId,
    earnings: [
      {
        code: "attendance_earnings",
        label: "Attendance Earnings",
        amount: attendanceEarnings,
        type: "earning",
      },
    ],
    deductions: professionalTax
      ? [{ code: "pt", label: "Professional Tax", amount: professionalTax, type: "deduction" }]
      : [],
    attendance: {
      workingDays: rec.totalWorkingDays ?? 0,
      presentDays: rec.present ?? 0,
      absentDays: rec.absent ?? 0,
      lopDays: rec.lop ?? 0,
      leaveLopDays: 0,
      overtimeHours: 0,
      leaveDays: (Number(rec.cl) || 0) + (Number(rec.pl) || 0) + (Number(rec.el) || 0),
      paidDays: rec.totalWorkingDays ?? null,
      paidLeaveDays: (Number(rec.pl) || 0) + (Number(rec.el) || 0),
      holidayCount: rec.holiday ?? 0,
      dailyRate: rec.perDay ?? undefined,
      monthlyGrossSalary: monthlySalary,
    },
    excel: {
      salary,
      workingDaySalary,
      present: rec.present,
      absent: rec.absent,
      holiday: rec.holiday,
      cl: rec.cl,
      pl: rec.pl,
      el: rec.el,
      lop: rec.lop,
      totalWorkingDays: rec.totalWorkingDays,
      professionalTax,
      amountAfterPt,
      reimbursement,
      finalPayout: finalPayable,
      perDay: rec.perDay,
    },
    payrollLifecycle: { itemStatus: "locked" },
    notes: ["Imported from Attendance Sheet 2026 — historical truth; not recalculated"],
  };

  if (deductions > professionalTax) {
    breakdown.deductions.push({
      code: "other",
      label: "Other deductions",
      amount: Math.round((deductions - professionalTax) * 100) / 100,
      type: "deduction",
    });
  }

  return breakdown;
}

export function buildExcelPayrollItemPayload(amounts, breakdown) {
  return {
    basic_salary: amounts.monthlySalary,
    total_allowances: amounts.reimbursement,
    total_deductions: amounts.deductions,
    gross_salary: amounts.attendanceEarnings,
    net_salary: amounts.netSalary,
    breakdown,
    status: "active",
  };
}

/** Re-derive correct columns from a persisted excel breakdown snapshot. */
export function amountsFromStoredExcelBreakdown(breakdown) {
  const excel = breakdown?.excel;
  if (!excel) return null;
  return computeExcelPayrollAmounts({
    finalPayout: excel.finalPayout,
    salary: excel.salary,
    workingDaySalary: excel.workingDaySalary,
    professionalTax: excel.professionalTax,
    reimbursement: excel.reimbursement,
    amountAfterPt: excel.amountAfterPt,
    totalWorkingDays: breakdown.attendance?.workingDays,
    present: breakdown.attendance?.presentDays,
    absent: breakdown.attendance?.absentDays,
    lop: breakdown.attendance?.lopDays,
    holiday: breakdown.attendance?.holidayCount,
    perDay: breakdown.attendance?.dailyRate,
  });
}
